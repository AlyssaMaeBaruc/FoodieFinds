var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { parseDate, weekRange } = require('../model/dates');
const { buildShoppingList } = require('../model/shoppingList');
const { spoonacular, SpoonacularError } = require('../model/spoonacular');
const { cacheRecipes } = require('../model/recipeIngredients');
const { isPantryBasic } = require('../model/pantryBasics');

// errors with a status code and a message that is safe to show in the app
class ListError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// the week's planned meals, joined with their saved meal details
async function plannedMeals(start, end) {
  const result = await db(
    `SELECT mp.id AS plan_id, DATE_FORMAT(mp.plan_date, '%Y-%m-%d') AS plan_date, mp.slot, mp.servings,
            mp.saved_meal_id, sm.title, sm.image, sm.spoonacular_id, sm.is_custom
     FROM meal_plan mp
     JOIN saved_meals sm ON sm.id = mp.saved_meal_id
     WHERE mp.plan_date BETWEEN ? AND ?
     ORDER BY mp.plan_date, mp.slot;`,
    [start, end]
  );
  return result.data;
}

// identifies which meals are planned, to tell whether the plan changed after the list was made
// (portions don't affect the list, so they aren't part of it)
const planSignature = (meals) =>
  meals.map((m) => `${m.plan_id}:${m.saved_meal_id}`).sort().join(',');

// mysql2 usually parses JSON columns already; parse if it came back as text
const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
};

// matches items between an old and a new list (to keep ticks); by name, because one
// line can combine several Spoonacular ids ("kosher salt" and "sea salt" -> "Salt")
const itemKey = (item) => item.ingredient_name.toLowerCase();

// which recipe a planned meal uses: a Spoonacular recipe, or one of your custom recipes
const recipeKey = (meal) => (meal.spoonacular_id ? `s:${meal.spoonacular_id}` : `c:${meal.saved_meal_id}`);

// all Spoonacular recipes in ONE call to save quota
async function fetchRecipes(ids) {
  try {
    const recipes = await spoonacular('/recipes/informationBulk', { query: { ids: ids.join(','), includeNutrition: false } });
    // refresh the ingredient cache for "Fill my week" at no extra cost
    await cacheRecipes(recipes).catch((err) => console.error('Error caching recipes', err));
    return recipes.map((recipe) => [`s:${recipe.id}`, recipe]);
  } catch (err) {
    if (err instanceof SpoonacularError) throw new ListError(err.status, err.message);
    throw err;
  }
}

// custom recipes' ingredients come from our own table, shaped like Spoonacular's
async function loadCustomRecipes(savedMealIds) {
  const rows = await db(
    'SELECT saved_meal_id, name, ingredient_id, aisle, image FROM custom_ingredients WHERE saved_meal_id IN (?) ORDER BY saved_meal_id, position;',
    [savedMealIds]
  );
  const recipes = new Map(savedMealIds.map((id) => [`c:${id}`, { extendedIngredients: [] }]));
  for (const row of rows.data) {
    recipes.get(`c:${row.saved_meal_id}`).extendedIngredients.push({
      id: row.ingredient_id,
      name: row.name,
      nameClean: row.name,
      originalName: row.name,
      aisle: row.aisle,
      image: row.image,
    });
  }
  return [...recipes.entries()].filter(([, recipe]) => recipe.extendedIngredients.length > 0);
}

// the saved list for a week, plus the meals it was made from
async function loadList(start, end) {
  const [items, week, currentMeals] = await Promise.all([
    db(
      `SELECT id, ingredient_id, ingredient_name, aisle, bought, used_in
       FROM shopping_list WHERE week_start = ?
       ORDER BY aisle, ingredient_name;`,
      [start]
    ),
    db('SELECT generated_at, meals FROM shopping_list_week WHERE week_start = ?;', [start]),
    plannedMeals(start, end),
  ]);

  const info = week.data[0];
  const meals = info ? parseJson(info.meals, []) : [];

  return {
    week_start: start,
    week_end: end,
    generated_at: info ? info.generated_at : null,
    meals,
    planned_meal_count: currentMeals.length,
    plan_changed: Boolean(info) && planSignature(meals) !== planSignature(currentMeals),
    items: items.data.map((item) => ({
      ...item,
      bought: Boolean(item.bought),
      used_in: parseJson(item.used_in, []),
      // pantry basics (model/pantryBasics.js) go in the "Check your pantry" section
      is_pantry: isPantryBasic(item.ingredient_name),
    })),
  };
}

function weekFrom(text) {
  const date = parseDate(text);
  if (!date) throw new ListError(400, 'week must be a date like 2026-10-07');
  return weekRange(date);
}

function sendError(res, err, what) {
  if (err instanceof ListError) return res.status(err.status).send({ message: err.message });
  console.error(`Error ${what}`, err);
  res.status(500).send({ message: `Something went wrong ${what}. Please try again.` });
}

// GET THE SHOPPING LIST FOR ONE WEEK (?week= can be any date in that week)
router.get('/', async function (req, res) {
  try {
    const { start, end } = weekFrom(req.query.week);
    res.send(await loadList(start, end));
  } catch (err) {
    sendError(res, err, 'loading the shopping list');
  }
});

// GENERATE (OR REGENERATE) THE LIST FROM THE WEEK'S MEAL PLAN
router.post('/generate', async function (req, res) {
  try {
    const { start, end } = weekFrom(req.body.week);

    const meals = await plannedMeals(start, end);
    if (meals.length === 0) throw new ListError(400, 'No meals are planned for this week yet.');

    const keyed = meals.map((meal) => ({ ...meal, recipe_key: recipeKey(meal) }));
    const spoonacularIds = [...new Set(meals.filter((m) => m.spoonacular_id).map((m) => m.spoonacular_id))];
    const customIds = [...new Set(meals.filter((m) => !m.spoonacular_id && m.is_custom).map((m) => m.saved_meal_id))];
    const recipes = new Map([
      ...(spoonacularIds.length > 0 ? await fetchRecipes(spoonacularIds) : []),
      ...(customIds.length > 0 ? await loadCustomRecipes(customIds) : []),
    ]);
    const items = buildShoppingList(keyed, recipes);

    // remember which meals were used, and flag any that couldn't be included
    const mealsUsed = meals.map((meal) => ({
      ...meal,
      skipped: !recipes.has(recipeKey(meal)),
    }));

    // keep items ticked as bought if they are still on the new list
    const previous = await db('SELECT ingredient_id, ingredient_name FROM shopping_list WHERE week_start = ? AND bought = TRUE;', [start]);
    const boughtKeys = new Set(previous.data.map(itemKey));

    // replace the old list in one transaction; if anything fails, the connection closes
    // before COMMIT and MySQL rolls the whole thing back
    const statements = ['START TRANSACTION;', 'DELETE FROM shopping_list WHERE week_start = ?;'];
    const params = [start];
    if (items.length > 0) {
      statements.push(
        `INSERT INTO shopping_list (week_start, ingredient_id, ingredient_name, aisle, bought, used_in) VALUES ${items.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')};`
      );
      for (const item of items) {
        params.push(start, item.ingredient_id, item.ingredient_name, item.aisle, boughtKeys.has(itemKey(item)), JSON.stringify(item.used_in));
      }
    }
    statements.push(
      `INSERT INTO shopping_list_week (week_start, generated_at, meals) VALUES (?, NOW(), ?) AS new
       ON DUPLICATE KEY UPDATE generated_at = new.generated_at, meals = new.meals;`,
      'COMMIT;'
    );
    params.push(start, JSON.stringify(mealsUsed));
    await db(statements.join('\n'), params);

    res.status(201).send(await loadList(start, end));
  } catch (err) {
    sendError(res, err, 'generating the shopping list');
  }
});

// TICK OR UNTICK SEVERAL ITEMS AT ONCE: { ids: [1, 2, 3], bought: true }
router.patch('/items', async function (req, res) {
  const { ids, bought } = req.body;
  if (typeof bought !== 'boolean') {
    return res.status(400).send({ message: 'bought must be true or false' });
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every(Number.isInteger)) {
    return res.status(400).send({ message: 'ids must be a list of item ids' });
  }
  try {
    // mysql2 expands the array into IN (1, 2, 3)
    await db('UPDATE shopping_list SET bought = ? WHERE id IN (?);', [bought, ids]);
    res.send({ ids, bought });
  } catch (err) {
    // the helper rejects when no row changed, e.g. every item already had this value
    if (err === 'Action not complete') return res.send({ ids, bought });
    sendError(res, err, 'updating the items');
  }
});

// TICK OR UNTICK AN ITEM AS BOUGHT
router.patch('/items/:id', async function (req, res) {
  const { bought } = req.body;
  if (typeof bought !== 'boolean') {
    return res.status(400).send({ message: 'bought must be true or false' });
  }
  try {
    await db('UPDATE shopping_list SET bought = ? WHERE id = ?;', [bought, req.params.id]);
    res.send({ id: Number(req.params.id), bought });
  } catch (err) {
    // the helper rejects when no row changed: either the item is missing or already had this value
    if (err === 'Action not complete') {
      const found = await db('SELECT id FROM shopping_list WHERE id = ?;', [req.params.id]).catch(() => ({ data: [] }));
      if (found.data.length > 0) return res.send({ id: Number(req.params.id), bought });
      return res.status(404).send({ message: 'Shopping list item not found' });
    }
    sendError(res, err, 'updating the item');
  }
});

module.exports = router;
