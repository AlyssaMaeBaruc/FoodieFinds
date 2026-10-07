// Pantry rules: where an ingredient is kept, and whether a shopping list item is already
// in the pantry. Pure functions so they are easy to test.

const { shoppingNames } = require('./shoppingList');

const LOCATIONS = ['fridge', 'freezer', 'cupboard'];

// --- Tuning (edit freely) ------------------------------------------------------
// where things from each Spoonacular aisle usually go; anything else -> cupboard
const LOCATION_BY_AISLE = {
  'Frozen': 'freezer',
  'Produce': 'fridge',
  'Milk, Eggs, Other Dairy': 'fridge',
  'Cheese': 'fridge',
  'Meat': 'fridge',
  'Seafood': 'fridge',
  'Refrigerated': 'fridge',
  'Health Foods': 'cupboard',
};
// produce that keeps better out of the fridge
const CUPBOARD_PRODUCE = ['onion', 'garlic', 'potato', 'sweet potato', 'banana', 'avocado', 'shallot', 'tomato'];
// -----------------------------------------------------------------------------

// "tomatoes" -> "tomato", "eggs" -> "egg" (for comparing only)
function singular(word) {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}
const words = (name) => String(name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(Boolean).map(singular);
// "Cherry Tomatoes" -> "cherry tomato"
const comparable = (name) => words(name).join(' ');

// the name the shopping list would use: { name: "feta cheese", image: "feta.png" } -> "feta"
function matchNameFor({ name, image = null, aisle = null }) {
  const [first] = shoppingNames({ name, nameClean: name, originalName: name, image, aisle }).names;
  return (first || name).toLowerCase().trim();
}

// Spoonacular can list several aisles ("Pasta and Rice;Refrigerated"): frozen or chilled wins
function locationFor({ aisle, name }) {
  const aisles = String(aisle ?? '').split(';').map((a) => a.trim());
  if (aisles.includes('Frozen')) return 'freezer';
  if (aisles.includes('Refrigerated')) return 'fridge';
  const cleanAisle = aisles[0];
  const location = LOCATION_BY_AISLE[cleanAisle] ?? 'cupboard';
  if (location === 'fridge' && cleanAisle === 'Produce' && CUPBOARD_PRODUCE.includes(comparable(name))) return 'cupboard';
  return location;
}

// the pantry item a shopping list item matches, or null.
// Same name ("eggs" / "egg"), or the same Spoonacular id when the names share a word
// (an id alone isn't enough: "salt and pepper" gives Salt and Pepper the same id)
function findInPantry(item, pantry) {
  const itemName = comparable(item.ingredient_name);
  const itemWords = new Set(words(item.ingredient_name));
  return pantry.find((p) => comparable(p.match_name) === itemName || comparable(p.name) === itemName)
    ?? pantry.find((p) => p.ingredient_id && p.ingredient_id === item.ingredient_id && words(p.name).some((w) => itemWords.has(w)))
    ?? null;
}

module.exports = { LOCATIONS, matchNameFor, locationFor, findInPantry, comparable };
