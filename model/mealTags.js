// Tags on saved meals: reading them, and suggesting them once for new meals.

const db = require('./helper');
const { ingredientsForMeals } = require('./recipeIngredients');
const { suggestTags } = require('./tagRules');

// all tags: the defaults in their fixed order, then your own A-Z
async function allTags() {
  const result = await db('SELECT id, name, is_default FROM tags ORDER BY is_default DESC, IF(is_default, id, 0), name;');
  return result.data.map((tag) => ({ ...tag, is_default: Boolean(tag.is_default) }));
}

// Map of saved meal id -> [{ id, name }] in the same order as allTags()
async function tagsByMeal() {
  const result = await db(
    `SELECT mt.saved_meal_id, t.id, t.name FROM meal_tags mt JOIN tags t ON t.id = mt.tag_id
     ORDER BY t.is_default DESC, IF(t.is_default, t.id, 0), t.name;`
  );
  const byMeal = new Map();
  for (const row of result.data) {
    if (!byMeal.has(row.saved_meal_id)) byMeal.set(row.saved_meal_id, []);
    byMeal.get(row.saved_meal_id).push({ id: row.id, name: row.name });
  }
  return byMeal;
}

// tags each meal from its ingredients, once (tags_suggested), so later edits are kept.
// meals: rows from saved_meals. Ingredients come from the cache; only Spoonacular
// recipes not cached yet cost points (one call for all of them).
async function suggestTagsForMeals(meals) {
  if (meals.length === 0) return;
  const [ingredients, tags] = await Promise.all([ingredientsForMeals(meals), allTags()]);
  const tagIds = new Map(tags.map((tag) => [tag.name, tag.id]));

  const rows = [];
  for (const meal of meals) {
    const info = ingredients.get(meal.id) ?? { names: [], aisles: [] };
    for (const name of suggestTags({ title: meal.title, ingredients: info.names, aisles: info.aisles })) {
      // a default tag may have been deleted from the database by hand
      if (tagIds.has(name)) rows.push([meal.id, tagIds.get(name)]);
    }
  }

  const statements = ['START TRANSACTION;'];
  const params = [];
  if (rows.length > 0) {
    // IGNORE: another request may have tagged the same meal a moment ago
    statements.push(`INSERT IGNORE INTO meal_tags (saved_meal_id, tag_id) VALUES ${rows.map(() => '(?, ?)').join(', ')};`);
    params.push(...rows.flat());
  }
  statements.push('UPDATE saved_meals SET tags_suggested = TRUE WHERE id IN (?);', 'COMMIT;');
  params.push(meals.map((meal) => meal.id));
  await db(statements.join('\n'), params);
}

module.exports = { allTags, tagsByMeal, suggestTagsForMeals };
