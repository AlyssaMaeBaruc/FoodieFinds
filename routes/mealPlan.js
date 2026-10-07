var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { parseDate, weekRange } = require('../model/dates');
const { ingredientsForMeals } = require('../model/recipeIngredients');
const { fillWeek } = require('../model/fillWeek');
const { isPantryBasic } = require('../model/pantryBasics');
const { SpoonacularError } = require('../model/spoonacular');
const { withGrade, HEALTH_COLUMNS, HEALTH_JOIN } = require('../model/healthGrade');
const { loadRules } = require('../model/weeklyRules');
const { loadPantry } = require('../model/pantry');
const { pantryItemFor } = require('../model/pantrySuggest');

const SLOTS = ['lunch', 'dinner'];

// GET THE PLAN FOR ONE WEEK (Monday to Sunday)
// ?week= can be any date in that week
router.get('/', async function (req, res) {
  const date = parseDate(req.query.week);
  if (!date) {
    return res.status(400).send({ message: 'week must be a date like 2026-10-07' });
  }

  const { start, end } = weekRange(date);
  try {
    const result = await db(
      `SELECT mp.id, DATE_FORMAT(mp.plan_date, '%Y-%m-%d') AS plan_date, mp.slot, mp.servings,
              mp.saved_meal_id, sm.title, sm.image, sm.spoonacular_id, ${HEALTH_COLUMNS}
       FROM meal_plan mp
       JOIN saved_meals sm ON sm.id = mp.saved_meal_id
       ${HEALTH_JOIN}
       WHERE mp.plan_date BETWEEN ? AND ?
       ORDER BY mp.plan_date, mp.slot;`,
      [start, end]
    );
    res.send({ week_start: start, week_end: end, meals: result.data.map(withGrade) });
  } catch (err) {
    console.error('Error loading meal plan', err);
    res.status(500).send(err);
  }
});

// ADD A MEAL TO THE PLAN
// if the slot is taken, answers 409 with the current meal; resend with replace: true to swap it
router.post('/', async function (req, res) {
  const { saved_meal_id, plan_date, slot, servings = 2, replace = false } = req.body;

  if (!Number.isInteger(saved_meal_id)) {
    return res.status(400).send({ message: 'saved_meal_id must be a whole number' });
  }
  if (!parseDate(plan_date)) {
    return res.status(400).send({ message: 'plan_date must be a date like 2026-10-07' });
  }
  if (!SLOTS.includes(slot)) {
    return res.status(400).send({ message: 'slot must be lunch or dinner' });
  }
  if (!Number.isInteger(servings) || servings < 1) {
    return res.status(400).send({ message: 'servings must be a whole number of at least 1' });
  }

  try {
    const meal = await db('SELECT id FROM saved_meals WHERE id = ?;', [saved_meal_id]);
    if (meal.data.length === 0) {
      return res.status(400).send({ message: 'That saved meal does not exist' });
    }

    const taken = await db(
      `SELECT mp.id, mp.saved_meal_id, sm.title
       FROM meal_plan mp JOIN saved_meals sm ON sm.id = mp.saved_meal_id
       WHERE mp.plan_date = ? AND mp.slot = ?;`,
      [plan_date, slot]
    );
    const existing = taken.data[0];

    if (existing && existing.saved_meal_id === saved_meal_id) {
      return res.status(200).send({ message: 'Meal is already planned for this slot', id: existing.id });
    }

    if (existing && !replace) {
      return res.status(409).send({ message: 'This slot already has a meal', existing });
    }

    if (existing) {
      await db('UPDATE meal_plan SET saved_meal_id = ?, servings = ? WHERE id = ?;', [saved_meal_id, servings, existing.id]);
      return res.status(200).send({ message: 'Meal replaced', id: existing.id });
    }

    await db(
      'INSERT INTO meal_plan (saved_meal_id, plan_date, slot, servings) VALUES (?, ?, ?, ?);',
      [saved_meal_id, plan_date, slot, servings]
    );
    res.status(201).send({ message: 'Meal added to plan' });
  } catch (err) {
    // someone else filled the slot between our check and the insert
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).send({ message: 'This slot already has a meal' });
    }
    console.error('Error adding to meal plan', err);
    res.status(500).send(err);
  }
});

// valid { plan_date, slot } pairs inside the given week, without duplicates
function slotsInWeek(list, start, end) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((s) => {
    const key = `${s?.plan_date}|${s?.slot}`;
    const ok = parseDate(s?.plan_date) && s.plan_date >= start && s.plan_date <= end && SLOTS.includes(s.slot) && !seen.has(key);
    seen.add(key);
    return ok;
  });
}

// SUGGEST MEALS FOR EMPTY SLOTS ("Fill my week" and the per-slot shuffle)
// body: { week, slots: [{ plan_date, slot }] to fill,
//         suggestions: [{ plan_date, slot, saved_meal_id }] already suggested and kept as-is,
//         avoid_ids: [saved meal ids not to suggest] }
router.post('/suggest', async function (req, res) {
  const date = parseDate(req.body.week);
  if (!date) return res.status(400).send({ message: 'week must be a date like 2026-10-07' });
  const { start, end } = weekRange(date);
  const prevStart = new Date(`${start}T00:00:00Z`);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  const prev = weekRange(prevStart);

  try {
    const [planned, lastWeek, saved] = await Promise.all([
      db("SELECT DATE_FORMAT(plan_date, '%Y-%m-%d') AS plan_date, slot, saved_meal_id FROM meal_plan WHERE plan_date BETWEEN ? AND ?;", [start, end]),
      db('SELECT DISTINCT saved_meal_id FROM meal_plan WHERE plan_date BETWEEN ? AND ?;', [prev.start, prev.end]),
      db('SELECT id, title, image, spoonacular_id, is_custom FROM saved_meals;'),
    ]);

    // never touch planned meals: drop any requested slot that is already taken
    const taken = new Set(planned.data.map((p) => `${p.plan_date}|${p.slot}`));
    const slots = slotsInWeek(req.body.slots, start, end).filter((s) => !taken.has(`${s.plan_date}|${s.slot}`));
    const kept = slotsInWeek(req.body.suggestions, start, end).filter((s) => Number.isInteger(s.saved_meal_id));
    const avoidIds = new Set((Array.isArray(req.body.avoid_ids) ? req.body.avoid_ids : []).filter(Number.isInteger));

    if (saved.data.length === 0) {
      return res.send({ suggestions: [], unfilled: slots, library_size: 0 });
    }

    // ingredients for every saved meal (cached; only new Spoonacular recipes cost points)
    const ingredients = await ingredientsForMeals(saved.data);
    // read after the ingredients, which may have just fetched a new recipe's score
    const [scores, rules, pantry] = await Promise.all([
      db(`SELECT sm.id, ${HEALTH_COLUMNS} FROM saved_meals sm ${HEALTH_JOIN};`),
      loadRules(),
      // the pantry is a bonus: without it (e.g. migration 009 not run) suggestions still work
      loadPantry().catch(() => []),
    ]);
    const grades = new Map(scores.data.map((row) => [row.id, withGrade(row).grade]));
    const library = saved.data.map((meal) => {
      const info = ingredients.get(meal.id) ?? { names: [], minutes: null };
      return {
        saved_meal_id: meal.id,
        title: meal.title,
        image: meal.image,
        spoonacular_id: meal.spoonacular_id,
        is_custom: meal.is_custom,
        // pantry basics don't count when comparing recipes
        ingredients: info.names.filter((name) => !isPantryBasic(name)),
        minutes: info.minutes,
        grade: grades.get(meal.id) ?? null,
      };
    });
    // which of each meal's ingredients you already have (pantry basics are already left out)
    library.forEach((meal) => {
      meal.pantry = meal.ingredients
        .map((name) => ({ name, item: pantryItemFor(name, pantry) }))
        .filter(({ item }) => item)
        .map(({ name, item }) => ({ name, use_soon: item.use_soon }));
    });
    const goodGoal = rules.min_good_grades;

    const result = fillWeek({
      library,
      fixed: [...planned.data, ...kept],
      slots,
      lastWeekIds: new Set(lastWeek.data.map((row) => row.saved_meal_id)),
      avoidIds,
      minGood: goodGoal.enabled ? goodGoal.value : null,
    });
    res.send({ ...result, library_size: library.length });
  } catch (err) {
    if (err instanceof SpoonacularError) return res.status(err.status).send({ message: err.message });
    // a migration hasn't been run yet (e.g. 006 creates the ingredient cache)
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).send({ message: 'The database is missing a table. Run the latest migration in model/migrations, then try again.' });
    }
    console.error('Error suggesting meals', err);
    res.status(500).send({ message: 'Something went wrong suggesting meals. Please try again.' });
  }
});

// ADD SEVERAL MEALS AT ONCE ("Keep these"): { meals: [{ saved_meal_id, plan_date, slot }] }
// all or nothing: if any slot was filled in the meantime, nothing is saved (409)
router.post('/bulk', async function (req, res) {
  const meals = Array.isArray(req.body.meals) ? req.body.meals : [];
  const valid = meals.length > 0 && meals.length <= 14 && meals.every((m) =>
    Number.isInteger(m?.saved_meal_id) && parseDate(m.plan_date) && SLOTS.includes(m.slot)
  );
  if (!valid) return res.status(400).send({ message: 'meals must be a list of { saved_meal_id, plan_date, slot }' });

  try {
    await db(
      `START TRANSACTION;
       INSERT INTO meal_plan (saved_meal_id, plan_date, slot) VALUES ${meals.map(() => '(?, ?, ?)').join(', ')};
       COMMIT;`,
      meals.flatMap((m) => [m.saved_meal_id, m.plan_date, m.slot])
    );
    res.status(201).send({ message: `${meals.length} meals added to the plan` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).send({ message: 'Some of those slots were filled in the meantime, so nothing was saved. Please try again.' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).send({ message: 'One of those meals no longer exists.' });
    }
    console.error('Error adding meals to plan', err);
    res.status(500).send({ message: 'Something went wrong saving the meals. Please try again.' });
  }
});

// REMOVE A MEAL FROM THE PLAN
router.delete('/:id', async function (req, res) {
  try {
    await db('DELETE FROM meal_plan WHERE id = ?;', [req.params.id]);
    res.send({ message: 'Meal removed from plan' });
  } catch (err) {
    // helper rejects with this when no row was deleted
    if (err === 'Action not complete') {
      return res.status(404).send({ message: 'Planned meal not found' });
    }
    console.error('Error removing from meal plan', err);
    res.status(500).send(err);
  }
});

module.exports = router;
