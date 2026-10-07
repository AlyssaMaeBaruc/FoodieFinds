// Ingredient lists for saved meals, as shopping names ("feta", "olive oil"), with a cache
// so Spoonacular recipes are only fetched once.
//   - Spoonacular recipes: read from cached_recipes; uncached ones are fetched in ONE bulk call
//   - custom recipes: read from custom_ingredients (always free)

const db = require('./helper');
const { spoonacular } = require('./spoonacular');
const { shoppingNames } = require('./shoppingList');

// shopping names for one recipe's ingredients, each with its aisle
function recipeShoppingNames(recipe) {
  const names = new Map();
  for (const ingredient of recipe.extendedIngredients ?? []) {
    const { names: shopping, aisle } = shoppingNames(ingredient);
    for (const name of shopping) if (!names.has(name)) names.set(name, aisle);
  }
  return names;
}

// stores fetched Spoonacular recipes (from informationBulk) in the cache, replacing old rows
async function cacheRecipes(recipes) {
  if (recipes.length === 0) return;
  const statements = ['START TRANSACTION;'];
  const params = [];
  for (const recipe of recipes) {
    statements.push(
      `INSERT INTO cached_recipes (spoonacular_id, ready_in_minutes, fetched_at) VALUES (?, ?, NOW()) AS new
       ON DUPLICATE KEY UPDATE ready_in_minutes = new.ready_in_minutes, fetched_at = new.fetched_at;`,
      'DELETE FROM cached_recipe_ingredients WHERE spoonacular_id = ?;'
    );
    params.push(recipe.id, Number.isInteger(recipe.readyInMinutes) ? recipe.readyInMinutes : null, recipe.id);
    const names = [...recipeShoppingNames(recipe)];
    if (names.length > 0) {
      statements.push(`INSERT INTO cached_recipe_ingredients (spoonacular_id, name, aisle) VALUES ${names.map(() => '(?, ?, ?)').join(', ')};`);
      for (const [name, aisle] of names) params.push(recipe.id, name, aisle);
    }
  }
  statements.push('COMMIT;');
  await db(statements.join('\n'), params);
}

// savedMeals: rows from saved_meals ({ id, spoonacular_id, is_custom })
// returns Map of saved meal id -> { names: [...], aisles: [aisle per name], minutes }
// fetches only Spoonacular recipes that aren't cached yet (one call for all of them)
async function ingredientsForMeals(savedMeals) {
  const result = new Map();
  const spoonacularIds = [...new Set(savedMeals.filter((m) => m.spoonacular_id).map((m) => m.spoonacular_id))];
  const customIds = savedMeals.filter((m) => !m.spoonacular_id && m.is_custom).map((m) => m.id);

  // Spoonacular recipes: fetch the uncached ones, then read everything from the cache
  if (spoonacularIds.length > 0) {
    const cached = await db('SELECT spoonacular_id FROM cached_recipes WHERE spoonacular_id IN (?);', [spoonacularIds]);
    const cachedIds = new Set(cached.data.map((row) => row.spoonacular_id));
    const missing = spoonacularIds.filter((id) => !cachedIds.has(id));
    if (missing.length > 0) {
      const fetched = await spoonacular('/recipes/informationBulk', { query: { ids: missing.join(','), includeNutrition: false } });
      await cacheRecipes(fetched);
    }

    const [recipes, ingredients] = await Promise.all([
      db('SELECT spoonacular_id, ready_in_minutes FROM cached_recipes WHERE spoonacular_id IN (?);', [spoonacularIds]),
      db('SELECT spoonacular_id, name, aisle FROM cached_recipe_ingredients WHERE spoonacular_id IN (?);', [spoonacularIds]),
    ]);
    const bySpoonacular = new Map(recipes.data.map((r) => [r.spoonacular_id, { names: [], aisles: [], minutes: r.ready_in_minutes }]));
    for (const row of ingredients.data) {
      const recipe = bySpoonacular.get(row.spoonacular_id);
      if (!recipe) continue;
      recipe.names.push(row.name);
      recipe.aisles.push(row.aisle);
    }
    for (const meal of savedMeals) {
      if (meal.spoonacular_id && bySpoonacular.has(meal.spoonacular_id)) result.set(meal.id, bySpoonacular.get(meal.spoonacular_id));
    }
  }

  // custom recipes: their stored ingredients, through the same shopping-name rules
  if (customIds.length > 0) {
    const rows = await db('SELECT saved_meal_id, name, image, aisle FROM custom_ingredients WHERE saved_meal_id IN (?);', [customIds]);
    const byMeal = new Map(customIds.map((id) => [id, { extendedIngredients: [] }]));
    for (const row of rows.data) {
      byMeal.get(row.saved_meal_id).extendedIngredients.push({ name: row.name, nameClean: row.name, originalName: row.name, image: row.image, aisle: row.aisle });
    }
    for (const [id, recipe] of byMeal) {
      const names = recipeShoppingNames(recipe);
      result.set(id, { names: [...names.keys()], aisles: [...names.values()], minutes: null });
    }
  }

  return result;
}

module.exports = { ingredientsForMeals, cacheRecipes };
