// Builds a shopping list from planned meals and their Spoonacular recipe details.
// One line per ingredient (no amounts), with the meals that use it.
// Pure functions (no database or network) so they are easy to test.

// --- Editable rules (lowercase) ---------------------------------------------

// shopping names for things you buy differently than recipes list them
const ALIASES = {
  'lemon juice': 'lemon',
  'lemon zest': 'lemon',
  'lime juice': 'lime',
  'lime zest': 'lime',
  'orange juice': 'orange',
  'orange zest': 'orange',
  'basil leaves': 'basil',
  'mint leaves': 'mint',
  'cilantro leaves': 'cilantro',
  'parsley leaves': 'parsley',
  'garlic cloves': 'garlic',
};

// one recipe ingredient that is really several shopping items
const SPLITS = {
  'salt and pepper': ['salt', 'pepper'],
};

// when the recipe's own wording is exactly this, use this name
// (Spoonacular sometimes reads a plain "pepper" as bell pepper)
const ORIGINAL_NAME_OVERRIDES = {
  pepper: 'pepper',
  'black pepper': 'pepper',
  salt: 'salt',
};

// -----------------------------------------------------------------------------

// Spoonacular uses these when it has no real picture, so they say nothing about the ingredient
const GENERIC_IMAGES = new Set(['no', 'null', 'blank']);

// "Spices and Seasonings;Baking" -> "Spices and Seasonings"
function cleanAisle(aisle) {
  const first = (aisle || '').split(';')[0].trim();
  return first && first !== '?' ? first : 'Other';
}

// "6 Roma tomatoes" -> "roma tomatoes"
function cleanName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/^[\d\s/.,½¼¾-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// for comparing words only: "tomatoes" -> "tomato", "leaves" -> "leave"
function singular(word) {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

// "feta.png" -> ["feta"], "olive-oil.jpg" -> ["olive", "oil"]
function imageWords(image) {
  const stem = (image || '').toLowerCase().replace(/\.(png|jpe?g|webp|gif)$/, '');
  return stem && !GENERIC_IMAGES.has(stem) ? stem.split('-').filter(Boolean) : null;
}

// The shopping name(s) for one recipe ingredient.
// Spoonacular gives near-identical ingredients different ids ("feta" / "fat free feta",
// "kosher salt" / "sea salt") but usually the same picture (feta.png, salt.jpg).
// When every word of the picture's name appears in the ingredient's name, the picture
// name is the core ingredient: "extra virgin olive oil" -> "olive oil",
// "bel gioioso mozzarella" -> "mozzarella".
// returns { names, aisle }
function shoppingNames(ingredient) {
  const original = cleanName(ingredient.originalName);
  // Spoonacular misread this one, so its aisle is wrong too; let other recipes decide it
  if (ORIGINAL_NAME_OVERRIDES[original]) return { names: [ORIGINAL_NAME_OVERRIDES[original]], aisle: 'Other' };

  let name = cleanName(ingredient.nameClean || ingredient.name) || 'ingredient';
  const pictureWords = imageWords(ingredient.image);
  if (pictureWords) {
    const nameWords = new Set(name.split(' ').map(singular));
    if (pictureWords.every((word) => nameWords.has(singular(word)))) name = pictureWords.join(' ');
  }

  name = ALIASES[name] ?? name;
  return { names: SPLITS[name] ?? [name], aisle: cleanAisle(ingredient.aisle) };
}

// "feta" -> "Feta"
const capitalize = (name) => name.charAt(0).toUpperCase() + name.slice(1);

// plannedMeals: [{ recipe_key, title }] in plan order
// recipesById: Map of recipe_key -> recipe with extendedIngredients
//   (Spoonacular recipes from /recipes/informationBulk, or custom recipes built from our own table)
// returns [{ ingredient_id, ingredient_name, aisle, used_in: [meal titles] }]
function buildShoppingList(plannedMeals, recipesById) {
  const lines = new Map();

  for (const meal of plannedMeals) {
    const recipe = recipesById.get(meal.recipe_key);
    if (!recipe) continue;

    for (const ingredient of recipe.extendedIngredients ?? []) {
      const { names, aisle } = shoppingNames(ingredient);
      for (const name of names) {
        const line = lines.get(name);
        if (line) {
          // a meal planned twice, or using an ingredient twice, is listed once
          if (!line.used_in.includes(meal.title)) line.used_in.push(meal.title);
          // a real aisle beats "Other" when one copy of the ingredient has none
          if (line.aisle === 'Other') line.aisle = aisle;
        } else {
          lines.set(name, {
            ingredient_id: ingredient.id ?? null,
            ingredient_name: capitalize(name),
            aisle,
            used_in: [meal.title],
          });
        }
      }
    }
  }

  return [...lines.values()].sort(
    (a, b) => a.aisle.localeCompare(b.aisle) || a.ingredient_name.localeCompare(b.ingredient_name)
  );
}

module.exports = { buildShoppingList, shoppingNames, cleanAisle };
