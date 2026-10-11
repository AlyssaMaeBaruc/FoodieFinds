// Spoonacular recipe search and recipe details, called from the server (the API key stays in
// .env) and saved, so the same search or recipe page again costs nothing.

const crypto = require('crypto');
const db = require('./helper');
const { spoonacular } = require('./spoonacular');
const { cacheRecipes } = require('./recipeIngredients');

// --- Tuning (edit freely) ------------------------------------------------------
const PAGE_SIZE = 24;          // recipes per page of results
const SEARCH_MAX_AGE_DAYS = 7; // search results are asked for again after this
const INFO_MAX_AGE_DAYS = 30;  // recipe details are asked for again after this
// -----------------------------------------------------------------------------

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const hashOf = (text) => crypto.createHash('sha256').update(text).digest('hex');

// { query: "salmon", ingredients: ["spinach"], cuisine: "Greek", offset: 0 }
// -> { results: [{ id, title, image }], totalResults, saved: true if it cost nothing }
async function searchRecipes({ query = '', ingredients = [], cuisine = '', offset = 0 }) {
  const search = {
    query: query.trim().toLowerCase(),
    ingredients: [...new Set(ingredients.map((i) => i.trim().toLowerCase()).filter(Boolean))].sort(),
    cuisine,
    offset,
  };
  const key = JSON.stringify(search);
  const hash = hashOf(key);

  const cached = await db(
    `SELECT results, total_results FROM recipe_search_cache
     WHERE search_hash = ? AND fetched_at > NOW() - INTERVAL ? DAY;`,
    [hash, SEARCH_MAX_AGE_DAYS]
  );
  if (cached.data[0]) {
    return { results: parseJson(cached.data[0].results), totalResults: cached.data[0].total_results, saved: true };
  }

  const params = { number: PAGE_SIZE, offset };
  if (search.query) params.query = search.query;
  if (search.ingredients.length > 0) {
    params.includeIngredients = search.ingredients.join(',');
    // recipes using the most of your ingredients first
    params.sort = 'max-used-ingredients';
  } else if (!search.query) {
    params.sort = 'popularity';
  }
  if (search.cuisine) params.cuisine = search.cuisine;

  const data = await spoonacular('/recipes/complexSearch', { query: params });
  const results = (data.results ?? []).map((r) => ({ id: r.id, title: r.title, image: r.image }));
  await db(
    `INSERT INTO recipe_search_cache (search_hash, search_key, results, total_results) VALUES (?, ?, ?, ?) AS new
     ON DUPLICATE KEY UPDATE results = new.results, total_results = new.total_results, fetched_at = NOW();`,
    [hash, key.slice(0, 1000), JSON.stringify(results), data.totalResults ?? results.length]
  );
  return { results, totalResults: data.totalResults ?? results.length, saved: false };
}

// one recipe's full details (for its recipe page)
async function recipeInfo(id) {
  const cached = await db(
    'SELECT data FROM recipe_info_cache WHERE spoonacular_id = ? AND fetched_at > NOW() - INTERVAL ? DAY;',
    [id, INFO_MAX_AGE_DAYS]
  );
  if (cached.data[0]) return parseJson(cached.data[0].data);

  const recipe = await spoonacular(`/recipes/${id}/information`, { query: { includeNutrition: false } });
  await db(
    `INSERT INTO recipe_info_cache (spoonacular_id, data) VALUES (?, ?) AS new
     ON DUPLICATE KEY UPDATE data = new.data, fetched_at = NOW();`,
    [id, JSON.stringify(recipe)]
  );
  // the same details fill the ingredient cache used by Fill my week and the pantry (no extra cost)
  await cacheRecipes([recipe]).catch((err) => console.error('Error caching recipe ingredients', err.message));
  return recipe;
}

module.exports = { searchRecipes, recipeInfo, PAGE_SIZE };
