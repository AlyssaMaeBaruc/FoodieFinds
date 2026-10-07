// Turns a pasted ingredient line into an English ingredient name Spoonacular understands.
//   "200 g de gambas"            -> core "gambas"         -> "prawns"
//   "2 tomates maduros"          -> core "tomates"        -> "tomatoes"
//   "1 cucharada de aceite de oliva" -> core "aceite de oliva" -> "olive oil"
//   "2 ripe tomatoes"            -> no Spanish match      -> sent as written
// Pure functions; the dictionary is passed in so learned words can override built-in ones.

// measures and filler words that never name the ingredient itself
const MEASURE_WORDS = new Set([
  'g', 'gr', 'grs', 'gramo', 'gramos', 'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos',
  'mg', 'ml', 'mililitro', 'mililitros', 'cl', 'dl', 'l', 'litro', 'litros',
  'cucharada', 'cucharadas', 'cda', 'cdas', 'cucharadita', 'cucharaditas', 'cdta', 'cdtas', 'cdita',
  'taza', 'tazas', 'vaso', 'vasos', 'pizca', 'pizcas', 'chorro', 'chorrito', 'puñado', 'punado',
  'diente', 'dientes', 'unidad', 'unidades', 'ud', 'uds', 'lata', 'latas', 'bote', 'botes',
  'paquete', 'paquetes', 'sobre', 'sobres', 'rama', 'ramas', 'ramita', 'ramitas', 'hoja', 'hojas',
  'loncha', 'lonchas', 'rodaja', 'rodajas', 'trozo', 'trozos', 'manojo', 'pieza', 'piezas',
]);

// small words that can come before the ingredient ("un puñado de", "una pizca de")
const LEADING_WORDS = new Set(['de', 'del', 'x', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'media', 'medio']);

// descriptions that come after the ingredient ("tomates maduros", "cebolla picada")
const DESCRIPTION_WORDS = new Set([
  'maduro', 'maduros', 'madura', 'maduras', 'grande', 'grandes', 'mediano', 'medianos', 'mediana', 'medianas',
  'pequeno', 'pequenos', 'pequena', 'pequenas', 'picado', 'picados', 'picada', 'picadas',
  'fresco', 'frescos', 'fresca', 'frescas', 'rallado', 'rallada', 'pelado', 'pelados', 'pelada', 'peladas',
  'troceado', 'troceados', 'troceada', 'cortado', 'cortados', 'cortada', 'cortadas', 'laminado', 'laminados',
  'congelado', 'congelados', 'congelada', 'cocido', 'cocidos', 'cocida', 'limpio', 'limpios', 'limpia',
  'entero', 'enteros', 'entera', 'molido', 'molida', 'seco', 'secos', 'seca', 'secas',
  'aprox', 'aproximadamente', 'opcional', 'gusto', 'al', 'a', 'para', 'freir', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
]);

// lowercase, without accents: "Limón" -> "limon", "piña" -> "pina"
function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// the words that name the ingredient: no quantities, measures or descriptions
//   "200 g de gambas" -> "gambas", "Patatas – 1 kilogramo (5 unidades)" -> "patatas"
function coreWords(line) {
  const words = normalize(line)
    .replace(/\(.*?\)/g, ' ')            // "(5 unidades grandes)"
    .split(/\s*[-,;:]\s*/)[0]            // "Sal – al gusto" -> "sal"
    .replace(/[\d½¼¾⅓⅔.,/]+/g, ' ')      // quantities
    .split(' ')
    .filter(Boolean);

  // drop leading articles, measures and "de" ("un puñado de perejil" -> "perejil")
  const leading = (word) => MEASURE_WORDS.has(word) || LEADING_WORDS.has(word);
  while (words.length > 1 && leading(words[0])) words.shift();
  // drop trailing descriptions ("tomates maduros" -> "tomates")
  while (words.length > 1 && (DESCRIPTION_WORDS.has(words[words.length - 1]) || words[words.length - 1] === 'de')) words.pop();
  return words.join(' ');
}

// dictionary: { spanish (normalized): english }
// returns { core, english, translated } where translated says whether a Spanish match was found
function translateLine(line, dictionary) {
  const core = coreWords(line);
  if (!core) return { core: '', english: line.trim(), translated: false };

  if (dictionary[core]) return { core, english: dictionary[core], translated: true };

  // longest matching phrase inside the core: "aceite de oliva virgen" -> "aceite de oliva"
  const words = core.split(' ');
  for (let length = words.length - 1; length >= 1; length -= 1) {
    for (let start = 0; start + length <= words.length; start += 1) {
      const phrase = words.slice(start, start + length).join(' ');
      if (dictionary[phrase]) return { core, english: dictionary[phrase], translated: true };
    }
  }
  // not Spanish we know: send the line as written (English lines go through unchanged)
  return { core, english: line.trim(), translated: false };
}

// built-in words + learned words (learned win), all keyed by normalized Spanish
function buildDictionary(builtIn, learnedRows) {
  const dictionary = {};
  for (const [spanish, english] of Object.entries(builtIn)) dictionary[normalize(spanish)] = english;
  for (const row of learnedRows) dictionary[normalize(row.spanish)] = row.english;
  return dictionary;
}

module.exports = { translateLine, buildDictionary, coreWords, normalize };
