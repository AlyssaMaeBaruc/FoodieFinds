// Pantry basics: shown in a collapsed 'Check your pantry' section instead of the main
// shopping list, and ignored by 'Fill my week' when comparing recipes.
// Edit this list freely (lowercase); the server restarts and picks it up automatically.
//
// Plain entries match the item name exactly: 'pepper' matches 'Pepper' but not 'Bell pepper'.
// Entries starting with * match any name ending in that word: '*vinegar' matches
// 'Balsamic vinegar' and 'Red wine vinegar'.
const PANTRY_BASICS = [
  'salt',
  'pepper',
  '*oil',
  '*vinegar',
  'sugar',
  'brown sugar',
  'flour',
  'baking soda',
  'baking powder',
  'cinnamon',
  'cumin',
  'paprika',
  'oregano',
  'nutmeg',
  'chili powder',
  'garlic powder',
  'onion powder',
  'bay leaf',
  'bay leaves',
  'cayenne',
  'vanilla extract',
  'soy sauce',
  'honey',
];

function isPantryBasic(name) {
  const lower = name.trim().toLowerCase();
  return PANTRY_BASICS.some((basic) =>
    basic.startsWith('*')
      ? lower === basic.slice(1) || lower.endsWith(` ${basic.slice(1)}`)
      : lower === basic
  );
}

module.exports = { PANTRY_BASICS, isPantryBasic };
