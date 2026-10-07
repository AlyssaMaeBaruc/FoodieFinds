// Pantry items in the database, and the ingredient search used to add them.

const db = require('./helper');
const { spoonacular } = require('./spoonacular');
const { cleanAisle } = require('./shoppingList');
const { matchNameFor, locationFor, findInPantry, comparable } = require('./pantryMatch');

const SEARCH_RESULTS = 6;
// Spoonacular is only asked once the search is this long (each search costs about 1 point)
const MIN_LIVE_SEARCH = 3;

const toItem = (row) => ({ ...row, use_soon: Boolean(row.use_soon) });

async function loadPantry() {
  const result = await db(
    `SELECT id, name, match_name, ingredient_id, aisle, location, use_soon, from_list_item_id, added_at
     FROM pantry_items ORDER BY use_soon DESC, name;`
  );
  return result.data.map(toItem);
}

// adds one ingredient (or returns the one already there with the same shopping name)
// { name, ingredient_id, aisle, image, location } -> the pantry item, and whether it's new
async function addToPantry({ name, ingredient_id: ingredientId = null, aisle = null, image = null, location = null, fromListItemId = null }) {
  const cleanName = String(name).trim().toLowerCase();
  const matchName = matchNameFor({ name: cleanName, image, aisle });
  const shelf = location ?? locationFor({ aisle, name: matchName });
  // SELECT 1 keeps the helper happy when the item was already there (nothing inserted)
  await db(
    `INSERT IGNORE INTO pantry_items (name, match_name, ingredient_id, aisle, location, from_list_item_id)
     VALUES (?, ?, ?, ?, ?, ?); SELECT 1;`,
    [cleanName, matchName, ingredientId, aisle ? cleanAisle(aisle) : null, shelf, fromListItemId]
  );
  const result = await db('SELECT * FROM pantry_items WHERE match_name = ?;', [matchName]);
  return toItem(result.data[0]);
}

// shopping list items just ticked as bought -> into the pantry, unless already there
// returns how many were added
async function addBoughtItems(listItems) {
  const pantry = await loadPantry();
  let added = 0;
  for (const item of listItems) {
    if (findInPantry(item, pantry)) continue;
    const pantryItem = await addToPantry({
      name: item.ingredient_name,
      ingredient_id: item.ingredient_id,
      aisle: item.aisle,
      fromListItemId: item.id,
    });
    pantry.push(pantryItem);
    if (pantryItem.from_list_item_id === item.id) added += 1;
  }
  return added;
}

// unticked on the list: take out only what those ticks added
async function removeAddedByListItems(listItemIds) {
  await db('DELETE FROM pantry_items WHERE from_list_item_id IN (?); SELECT 1;', [listItemIds]);
}

// --- ingredient search (adding to the pantry) ---------------------------------

// ingredients from your own recipes and shopping lists: free, and their ids match your lists
async function searchYourIngredients(query) {
  const like = `%${query}%`;
  const [list, custom] = await Promise.all([
    db('SELECT DISTINCT ingredient_id, LOWER(ingredient_name) AS name, aisle FROM shopping_list WHERE ingredient_name LIKE ? LIMIT 20;', [like]),
    db('SELECT DISTINCT ingredient_id, LOWER(name) AS name, aisle, image FROM custom_ingredients WHERE name LIKE ? LIMIT 20;', [like]),
  ]);
  return [...list.data, ...custom.data].map((row) => ({ ...row, image: row.image ?? null, source: 'yours' }));
}

// Spoonacular's ingredient autocomplete, each search cached so it never costs twice
async function searchSpoonacular(query) {
  const key = query.toLowerCase();
  const cached = await db('SELECT results FROM ingredient_search_cache WHERE query = ?;', [key]);
  let results = cached.data[0]?.results;
  if (typeof results === 'string') results = JSON.parse(results);
  if (!results) {
    const found = await spoonacular('/food/ingredients/autocomplete', {
      query: { query: key, number: SEARCH_RESULTS, metaInformation: true },
      timeoutMs: 10000,
    });
    results = found.map((r) => ({ name: r.name, ingredient_id: r.id ?? null, aisle: r.aisle ?? null, image: r.image ?? null }));
    await db(
      'INSERT INTO ingredient_search_cache (query, results) VALUES (?, ?) AS new ON DUPLICATE KEY UPDATE results = new.results;',
      [key, JSON.stringify(results)]
    );
  }
  return results.map((r) => ({ ...r, source: 'spoonacular' }));
}

// -> [{ name, ingredient_id, aisle, image, source, location, in_pantry }]
// your own ingredients first, then Spoonacular's; one result per shopping name
async function searchIngredients(query, pantry) {
  const yours = await searchYourIngredients(query);
  const live = query.length >= MIN_LIVE_SEARCH ? await searchSpoonacular(query) : [];
  const seen = new Set();
  const results = [];
  for (const r of [...yours, ...live]) {
    const matchName = matchNameFor(r);
    const key = comparable(matchName);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      ...r,
      aisle: r.aisle ? cleanAisle(r.aisle) : null,
      location: locationFor({ aisle: r.aisle, name: matchName }),
      in_pantry: Boolean(findInPantry({ ingredient_name: matchName, ingredient_id: r.ingredient_id }, pantry)),
    });
  }
  // names starting with what you typed first ("egg" before "eggplant" before "boiled egg")
  const q = query.toLowerCase();
  return results
    .sort((a, b) => Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)) || a.name.length - b.name.length)
    .slice(0, 8);
}

module.exports = { loadPantry, addToPantry, addBoughtItems, removeAddedByListItems, searchIngredients };
