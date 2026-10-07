// "What can I make?": how well a recipe fits what's in the pantry. Pure functions.

const { findInPantry, comparable } = require('./pantryMatch');
const { isPantryBasic } = require('./pantryBasics');

// --- Tuning (edit freely) ------------------------------------------------------
const SCORE = {
  uses: 1,       // per pantry item the recipe uses
  usesSoon: 3,   // per "Use soon" item it uses (instead of 1)
  missing: -1,   // per ingredient you'd still need
};
const MAX_MISSING = 2; // "missing 1-2" group
// -----------------------------------------------------------------------------

// one ingredient name -> the pantry item it matches, or null
const pantryItemFor = (name, pantry, ingredientId = null) =>
  findInPantry({ ingredient_name: name, ingredient_id: ingredientId }, pantry);

// ingredient names (pantry basics like salt left out) -> what's used, what's missing, a score
// uses: [{ name, use_soon }]; missing: [names]
function fitToPantry(names, pantry) {
  const uses = [];
  const missing = [];
  for (const name of new Set(names)) {
    if (isPantryBasic(name)) continue;
    const item = pantryItemFor(name, pantry);
    if (item) uses.push({ name, use_soon: item.use_soon });
    else missing.push(name);
  }
  const score = uses.reduce((sum, use) => sum + (use.use_soon ? SCORE.usesSoon : SCORE.uses), 0) + missing.length * SCORE.missing;
  return { uses, missing, score };
}

const byScore = (a, b) => b.score - a.score || a.missing.length - b.missing.length || a.title.localeCompare(b.title);

// library: [{ ...meal, ingredients: [names] }] -> { ready: [...], almost: [...] }
// ready = nothing missing (and uses something from the pantry); almost = missing 1-2
function libraryMatches(library, pantry) {
  const ready = [];
  const almost = [];
  for (const meal of library) {
    if (meal.ingredients.length === 0) continue;
    const fit = fitToPantry(meal.ingredients, pantry);
    if (fit.uses.length === 0) continue;
    const entry = { ...meal, ...fit };
    delete entry.ingredients;
    if (fit.missing.length === 0) ready.push(entry);
    else if (fit.missing.length <= MAX_MISSING) almost.push(entry);
  }
  return { ready: ready.sort(byScore), almost: almost.sort(byScore) };
}

// Spoonacular already says these used ingredients are from the pantry, just worded its way
// ("salmon fillets", "lemon wedges"): also match when the pantry name's words are all in it
function usedPantryItem(ingredient, pantry) {
  const words = new Set(comparable(ingredient.name).split(' '));
  return pantryItemFor(ingredient.name, pantry, ingredient.id)
    ?? pantry.find((p) => comparable(p.match_name).split(' ').every((word) => words.has(word)))
    ?? null;
}

// Spoonacular's findByIngredients results -> the same shape, re-ranked so "Use soon" counts extra
function rankIdeas(ideas, pantry) {
  return ideas.map((idea) => {
    // each pantry item counts once (a recipe can list "smoked salmon" and "salmon fillets")
    const byName = new Map();
    for (const i of idea.usedIngredients ?? []) {
      const item = usedPantryItem(i, pantry);
      const name = item?.name ?? i.name;
      if (!byName.has(name)) byName.set(name, { name, use_soon: Boolean(item?.use_soon) });
    }
    // Spoonacular can list a pantry item as missing in another form ("lemon juice" when you have lemon)
    const missing = [];
    for (const i of idea.missedIngredients ?? []) {
      if (isPantryBasic(i.name)) continue;
      const item = usedPantryItem(i, pantry);
      if (!item) missing.push(i.name);
      else if (!byName.has(item.name)) byName.set(item.name, { name: item.name, use_soon: Boolean(item.use_soon) });
    }
    const uses = [...byName.values()];
    const score = uses.reduce((sum, use) => sum + (use.use_soon ? SCORE.usesSoon : SCORE.uses), 0) + missing.length * SCORE.missing;
    return { spoonacular_id: idea.id, title: idea.title, image: idea.image, uses, missing, score };
  }).sort(byScore);
}

module.exports = { fitToPantry, libraryMatches, rankIdeas, pantryItemFor };
