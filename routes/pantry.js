var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { SpoonacularError } = require('../model/spoonacular');
const { loadPantry, addToPantry, searchIngredients } = require('../model/pantry');
const { LOCATIONS } = require('../model/pantryMatch');

function sendError(res, err, what) {
  if (err instanceof SpoonacularError) return res.status(err.status).send({ message: err.message });
  console.error(`Error ${what}`, err);
  res.status(500).send({ message: `Something went wrong ${what}. Please try again.` });
}

// EVERYTHING IN THE PANTRY: [{ id, name, location, use_soon, ... }]
router.get('/', async function (req, res) {
  try {
    res.send(await loadPantry());
  } catch (err) {
    sendError(res, err, 'loading your pantry');
  }
});

// SEARCH INGREDIENTS TO ADD: ?q=feta (your own ingredients first, then Spoonacular's)
router.get('/search', async function (req, res) {
  const query = String(req.query.q ?? '').trim().replace(/\s+/g, ' ');
  if (query.length < 2 || query.length > 60) return res.send([]);
  try {
    res.send(await searchIngredients(query, await loadPantry()));
  } catch (err) {
    sendError(res, err, 'searching ingredients');
  }
});

// ADD AN INGREDIENT: { name, ingredient_id, aisle, image, location }
// -> the item (201), or the one already there with the same name (200)
router.post('/', async function (req, res) {
  const { name, ingredient_id: ingredientId, aisle, image, location } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 255) {
    return res.status(400).send({ message: 'Give the ingredient a name' });
  }
  if (location !== undefined && !LOCATIONS.includes(location)) {
    return res.status(400).send({ message: 'location must be fridge, freezer or cupboard' });
  }
  try {
    const before = await loadPantry();
    const item = await addToPantry({
      name,
      ingredient_id: Number.isInteger(ingredientId) ? ingredientId : null,
      aisle: typeof aisle === 'string' ? aisle.slice(0, 100) : null,
      image: typeof image === 'string' ? image.slice(0, 255) : null,
      location,
    });
    const isNew = !before.some((p) => p.id === item.id);
    res.status(isNew ? 201 : 200).send({ ...item, already_there: !isNew });
  } catch (err) {
    sendError(res, err, 'adding to your pantry');
  }
});

// CHANGE AN ITEM: { use_soon: true } and/or { location: "freezer" }
router.patch('/:id', async function (req, res) {
  const { use_soon: useSoon, location } = req.body;
  const changes = [];
  const params = [];
  if (useSoon !== undefined) {
    if (typeof useSoon !== 'boolean') return res.status(400).send({ message: 'use_soon must be true or false' });
    changes.push('use_soon = ?');
    params.push(useSoon);
  }
  if (location !== undefined) {
    if (!LOCATIONS.includes(location)) return res.status(400).send({ message: 'location must be fridge, freezer or cupboard' });
    changes.push('location = ?');
    params.push(location);
  }
  if (changes.length === 0) return res.status(400).send({ message: 'Nothing to change' });
  try {
    // SELECT 1 keeps the helper happy when the value didn't change
    await db(`UPDATE pantry_items SET ${changes.join(', ')} WHERE id = ?; SELECT 1;`, [...params, req.params.id]);
    const result = await db('SELECT * FROM pantry_items WHERE id = ?;', [req.params.id]);
    if (result.data.length === 0) return res.status(404).send({ message: 'That item is no longer in your pantry' });
    res.send({ ...result.data[0], use_soon: Boolean(result.data[0].use_soon) });
  } catch (err) {
    sendError(res, err, 'updating your pantry');
  }
});

// REMOVE AN ITEM (gone already counts as removed)
router.delete('/:id', async function (req, res) {
  try {
    await db('DELETE FROM pantry_items WHERE id = ?; SELECT 1;', [req.params.id]);
    res.send({ deleted: Number(req.params.id) });
  } catch (err) {
    sendError(res, err, 'removing from your pantry');
  }
});

module.exports = router;
