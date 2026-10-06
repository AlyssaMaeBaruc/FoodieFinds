var express = require('express');
var router = express.Router();
const db = require('../model/helper');

const SLOTS = ['lunch', 'dinner'];

// dates travel as plain "YYYY-MM-DD" text so no time zone can shift a meal to another day
function parseDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  // rejects impossible dates like 2026-02-31
  return date.toISOString().slice(0, 10) === text ? date : null;
}

const toDateText = (date) => date.toISOString().slice(0, 10);

// Monday and Sunday of the week containing the given date
function weekRange(date) {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: toDateText(monday), end: toDateText(sunday) };
}

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
              mp.saved_meal_id, sm.title, sm.image, sm.spoonacular_id
       FROM meal_plan mp
       JOIN saved_meals sm ON sm.id = mp.saved_meal_id
       WHERE mp.plan_date BETWEEN ? AND ?
       ORDER BY mp.plan_date, mp.slot;`,
      [start, end]
    );
    res.send({ week_start: start, week_end: end, meals: result.data });
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
