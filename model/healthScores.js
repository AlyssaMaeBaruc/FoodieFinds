// Gets Spoonacular's healthScore for saved meals that don't have one yet, once per recipe.
//   - Spoonacular recipes: comes with their ingredients (one bulk call for all missing ones)
//   - custom recipes: Spoonacular's recipe analyzer estimates it from the ingredient lines

const db = require('./helper');
const { spoonacular } = require('./spoonacular');
const { ingredientsForMeals } = require('./recipeIngredients');
const { translateLine, buildDictionary } = require('./translateIngredient');
const builtInDictionary = require('./spanishDictionary');

// each analysis costs about 1.5 points, so a big batch of new custom recipes is spread over visits
const MAX_ANALYSES_PER_VISIT = 5;

// built-in Spanish words + the ones taught in the Add recipe review step
async function loadDictionary() {
  const learned = await db('SELECT spanish, english FROM ingredient_translations;');
  return buildDictionary(builtInDictionary, learned.data);
}

// asks Spoonacular to estimate one custom recipe's score; null if it can't
async function analyzeCustomMeal(meal, dictionary) {
  const rows = await db('SELECT original FROM custom_ingredients WHERE saved_meal_id = ? ORDER BY position;', [meal.id]);
  if (rows.data.length === 0) return null;
  const steps = Array.isArray(meal.steps) ? meal.steps : [];
  const recipe = await spoonacular('/recipes/analyze', {
    query: { includeNutrition: true },
    json: {
      title: meal.title,
      servings: 2,
      ingredients: rows.data.map((row) => translateLine(row.original, dictionary).english),
      instructions: steps.join('\n'),
    },
    timeoutMs: 30000,
  });
  return Number.isFinite(recipe.healthScore) ? Math.round(Math.min(100, Math.max(0, recipe.healthScore))) : null;
}

// meals: rows from saved_meals. Errors (e.g. daily limit) are thrown; the next visit tries again.
async function fillMissingHealthScores(meals) {
  const spoonacularMeals = meals.filter((meal) => meal.spoonacular_id);
  if (spoonacularMeals.length > 0) {
    const checked = await db(
      'SELECT spoonacular_id FROM cached_recipes WHERE spoonacular_id IN (?) AND health_checked = TRUE;',
      [spoonacularMeals.map((meal) => meal.spoonacular_id)]
    );
    const done = new Set(checked.data.map((row) => row.spoonacular_id));
    const missing = spoonacularMeals.filter((meal) => !done.has(meal.spoonacular_id));
    // fetches and caches them (with their health score) in one call
    if (missing.length > 0) await ingredientsForMeals(missing);
  }

  const customMeals = meals.filter((meal) => !meal.spoonacular_id && meal.is_custom && !meal.health_checked)
    .slice(0, MAX_ANALYSES_PER_VISIT);
  if (customMeals.length > 0) {
    const dictionary = await loadDictionary();
    for (const meal of customMeals) {
      const score = await analyzeCustomMeal(meal, dictionary);
      // checked even without a score, so it isn't asked again (you can set the grade yourself)
      await db('UPDATE saved_meals SET health_score = ?, health_checked = TRUE WHERE id = ?;', [score, meal.id]);
    }
  }
}

module.exports = { fillMissingHealthScores };
