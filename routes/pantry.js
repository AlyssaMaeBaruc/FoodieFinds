var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const crypto = require('crypto');
const { spoonacular, SpoonacularError } = require('../model/spoonacular');
const { loadPantry, addToPantry, searchIngredients } = require('../model/pantry');
const { LOCATIONS } = require('../model/pantryMatch');
const { libraryMatches, rankIdeas } = require('../model/pantrySuggest');
const { ingredientsForMeals } = require('../model/recipeIngredients');
const { withGrade, HEALTH_COLUMNS, HEALTH_JOIN } = require('../model/healthGrade');

const IDEAS_COUNT = 10;

// the pantry as one text: changes whenever an item is added, removed or marked "use soon"
const pantryKey = (pantry) => pantry.map((p) => `${p.match_name}${p.use_soon ? '*' : ''}`).sort().join(',');
const hashOf = (text) => crypto.createHash('sha256').update(text).digest('hex');

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

// WHAT CAN I MAKE (from your library): { ready: [...], almost: [...] }, 0 points
// (ingredients come from the cache; only a newly saved Spoonacular recipe is fetched once)
router.get('/suggestions', async function (req, res) {
  try {
    const [pantry, saved] = await Promise.all([
      loadPantry(),
      db(`SELECT sm.id, sm.title, sm.image, sm.spoonacular_id, sm.is_custom, ${HEALTH_COLUMNS}
          FROM saved_meals sm ${HEALTH_JOIN};`),
    ]);
    if (pantry.length === 0 || saved.data.length === 0) return res.send({ ready: [], almost: [], pantry_size: pantry.length });
    const ingredients = await ingredientsForMeals(saved.data);
    const library = saved.data.map((meal) => {
      const { grade } = withGrade(meal);
      return {
        id: meal.id,
        title: meal.title,
        image: meal.image,
        spoonacular_id: meal.spoonacular_id,
        is_custom: Boolean(meal.is_custom),
        grade,
        ingredients: ingredients.get(meal.id)?.names ?? [],
      };
    });
    res.send({ ...libraryMatches(library, pantry), pantry_size: pantry.length });
  } catch (err) {
    sendError(res, err, 'finding meals you can make');
  }
});

// NEW IDEAS FROM SPOONACULAR for this pantry: { ideas: [...] | null, saved: bool }
// ?fetch=1 asks Spoonacular (about 1 point) when there's no saved answer for this exact pantry;
// without it, only a saved answer is returned (free)
router.get('/ideas', async function (req, res) {
  try {
    const pantry = await loadPantry();
    if (pantry.length === 0) return res.send({ ideas: [], saved: false });
    const key = pantryKey(pantry);
    const hash = hashOf(key);

    const cached = await db('SELECT results FROM pantry_ideas_cache WHERE pantry_hash = ?;', [hash]);
    let found = cached.data[0]?.results;
    if (typeof found === 'string') found = JSON.parse(found);
    const fromCache = Boolean(found);
    if (!found) {
      if (req.query.fetch !== '1') return res.send({ ideas: null, saved: false });
      // "use soon" items first, so Spoonacular weighs them in
      const names = [...pantry].sort((a, b) => Number(b.use_soon) - Number(a.use_soon)).map((p) => p.name);
      found = await spoonacular('/recipes/findByIngredients', {
        query: { ingredients: names.join(','), number: IDEAS_COUNT, ranking: 1, ignorePantry: true },
        timeoutMs: 15000,
      });
      await db(
        `INSERT INTO pantry_ideas_cache (pantry_key, pantry_hash, results) VALUES (?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE results = new.results, fetched_at = NOW();`,
        [key.slice(0, 2000), hash, JSON.stringify(found)]
      );
    }

    // recipes already in your library are left out
    const saved = await db('SELECT spoonacular_id FROM saved_meals WHERE spoonacular_id IS NOT NULL;');
    const savedIds = new Set(saved.data.map((row) => row.spoonacular_id));
    const ideas = rankIdeas(found, pantry).filter((idea) => !savedIds.has(idea.spoonacular_id));
    res.send({ ideas, saved: fromCache });
  } catch (err) {
    sendError(res, err, 'finding new ideas');
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
