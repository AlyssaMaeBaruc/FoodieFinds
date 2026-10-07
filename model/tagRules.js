// Suggested tags for a saved meal, from its ingredients and title.
// Pure function (no database) so it's easy to test. Edit the word lists freely:
// words are matched whole and plurals count too ("prawn" also finds "prawns").

// the tags every library starts with, in display order
const DEFAULT_TAGS = ['fish', 'seafood', 'chicken', 'beef', 'pork', 'veggie', 'eggs', 'pasta', 'rice', 'salad'];

// --- Tuning (edit freely) ------------------------------------------------------
// meat and fish, from the ingredients. Checked in this order and each ingredient gets the
// first match, so "salmon steak" is fish (not beef) and "pork tenderloin" is pork.
const PROTEIN_RULES = [
  ['fish', ['fish', 'salmon', 'tuna', 'cod', 'hake', 'sea bass', 'trout', 'sardine', 'anchovy', 'anchovies', 'mackerel', 'swordfish', 'tilapia', 'haddock', 'merluza', 'bacalao']],
  ['seafood', ['prawn', 'shrimp', 'gamba', 'squid', 'calamari', 'mussel', 'clam', 'octopus', 'scallop', 'lobster', 'crab', 'langostino']],
  ['chicken', ['chicken', 'pollo']],
  ['pork', ['pork', 'bacon', 'ham', 'chorizo', 'sausage', 'prosciutto', 'pancetta', 'salami', 'pepperoni', 'jamon', 'lardon']],
  ['beef', ['beef', 'steak', 'sirloin', 'filet mignon', 'ternera']],
];
// other meat: no tag of their own, but the meal isn't veggie
const OTHER_MEAT = ['lamb', 'turkey', 'duck', 'veal', 'venison', 'rabbit', 'goat', 'meat', 'mince', 'gelatin'];
// stock, broth and sauces don't make a meal "chicken" or "fish", but it isn't veggie either
const FLAVOURING = ['stock', 'broth', 'bouillon', 'sauce', 'gravy', 'cube'];
// Spoonacular aisles that mean meat or fish
const MEAT_AISLES = ['Meat', 'Seafood'];

// from the ingredients or the title
const PASTA = ['pasta', 'spaghetti', 'penne', 'fusilli', 'macaroni', 'linguine', 'tagliatelle', 'lasagna', 'lasagne', 'fettuccine', 'rigatoni', 'farfalle', 'orzo', 'ravioli', 'tortellini', 'gnocchi'];
const RICE = ['rice', 'risotto', 'paella', 'arroz'];
const NOT_RICE = ['rice vinegar', 'rice wine', 'rice paper', 'rice flour', 'rice noodle'];
// from the title only (eggs turn up as a small ingredient in lots of recipes)
const EGGS = ['egg', 'omelette', 'omelet', 'frittata', 'shakshuka', 'huevo'];
const SALAD = ['salad', 'ensalada'];
// -----------------------------------------------------------------------------

// "Jamón Ibérico" -> "jamon iberico"
const normalize = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// whole words, with an optional plural ending
const wordsPattern = (words) => new RegExp(`\\b(${words.map(escape).join('|')})(s|es)?\\b`);

const PROTEIN_PATTERNS = PROTEIN_RULES.map(([tag, words]) => [tag, wordsPattern(words)]);
const OTHER_MEAT_PATTERN = wordsPattern(OTHER_MEAT);
const FLAVOURING_PATTERN = wordsPattern(FLAVOURING);
const PASTA_PATTERN = wordsPattern(PASTA);
const RICE_PATTERN = wordsPattern(RICE);
const NOT_RICE_PATTERN = wordsPattern(NOT_RICE);
const EGGS_PATTERN = wordsPattern(EGGS);
const SALAD_PATTERN = wordsPattern(SALAD);

// meal: { title, ingredients: [shopping names], aisles: [aisle per ingredient] }
// returns tag names, in DEFAULT_TAGS order, e.g. ['beef', 'rice']
function suggestTags({ title = '', ingredients = [], aisles = [] }) {
  const tags = new Set();
  const names = ingredients.map(normalize);
  const titleText = normalize(title);
  let hasMeat = aisles.some((aisle) => MEAT_AISLES.includes(aisle));

  for (const name of names) {
    const protein = PROTEIN_PATTERNS.find(([, pattern]) => pattern.test(name));
    if (protein || OTHER_MEAT_PATTERN.test(name)) hasMeat = true;
    if (protein && !FLAVOURING_PATTERN.test(name)) tags.add(protein[0]);
  }
  // only when we actually know the ingredients
  if (names.length > 0 && !hasMeat) tags.add('veggie');

  const inIngredientsOrTitle = (pattern, not) =>
    [...names, titleText].some((text) => pattern.test(text) && !(not && not.test(text)));
  if (inIngredientsOrTitle(PASTA_PATTERN)) tags.add('pasta');
  if (inIngredientsOrTitle(RICE_PATTERN, NOT_RICE_PATTERN)) tags.add('rice');
  if (EGGS_PATTERN.test(titleText)) tags.add('eggs');
  if (SALAD_PATTERN.test(titleText)) tags.add('salad');

  return DEFAULT_TAGS.filter((tag) => tags.has(tag));
}

module.exports = { suggestTags, DEFAULT_TAGS };
