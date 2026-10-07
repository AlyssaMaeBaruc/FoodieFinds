// Reads a TikTok caption into a recipe: a short title, ingredient lines and steps.
// TikTok's oEmbed sends the caption as ONE line (line breaks are lost), so sections are found
// by their headings ("Ingredients:", "Ingredientes:") and split on bullets, emojis and amounts.
// Pure functions so they are easy to test.

// --- Editable words (lowercase) ----------------------------------------------
const INGREDIENT_HEADINGS = ['ingredients', 'ingredient list', 'you will need', "you'll need", 'ingredientes', 'necesitas'];
const STEP_HEADINGS = [
  'instructions', 'method', 'directions', 'steps', 'how to make it', 'preparation',
  'instrucciones', 'preparacion', 'preparación', 'elaboracion', 'elaboración', 'pasos', 'modo de preparacion', 'modo de preparación',
];
const MAX_TITLE_LENGTH = 70;
// ------------------------------------------------------------------------------

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headingPattern = (words) => new RegExp(`(?:^|[\\s\\p{Extended_Pictographic}.!:])(${words.map(escape).join('|')})\\s*:`, 'iu');
const INGREDIENTS_HEADING = headingPattern(INGREDIENT_HEADINGS);
const STEPS_HEADING = headingPattern(STEP_HEADINGS);
// emojis, skin tones and flags (🇪🇸 is two "regional indicator" letters)
const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}‍️]/gu;
const HASHTAGS = /#[\p{L}\p{N}_]+/gu;
const BULLETS = /[•·▪●◦‣▫▸►✓✔☐]|(?:^|\s)[-–*](?=\s)/gu;

const clean = (text) => text.replace(/\s+/g, ' ').trim();

// the caption without hashtags (they end most captions)
const withoutHashtags = (caption) => clean(String(caption ?? '').replace(HASHTAGS, ' '));

// "day 99/365: Easy Creamy Beef Pasta Recipe (30-Minute Dinner)✨ This creamy…"
//   -> "Easy Creamy Beef Pasta Recipe (30-Minute Dinner)"
function titleFromCaption(caption) {
  let text = withoutHashtags(caption)
    // series counters like "day 99/365:", "Día 3:", "part 2 -"
    .replace(/^\s*(day|d[ií]a|part|parte|ep(isode)?)\s*\d+(\s*\/\s*\d+)?\s*[:\-–|]\s*/iu, '');
  // the title is everything up to the first emoji, sentence end or section heading
  const ends = [text.search(EMOJI), text.search(/[.!?](\s|$)/), text.search(INGREDIENTS_HEADING), text.search(STEPS_HEADING)]
    .filter((index) => index > 0);
  if (ends.length > 0) text = text.slice(0, Math.min(...ends));
  text = clean(text.replace(EMOJI, ' '));
  if (text.length > MAX_TITLE_LENGTH) {
    const cut = text.slice(0, MAX_TITLE_LENGTH);
    text = `${cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : MAX_TITLE_LENGTH).trim()}…`;
  }
  return text;
}

// text after a heading, up to the next heading of the other kind (or the end)
function section(text, heading, stopAt) {
  const match = heading.exec(text);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const stop = rest.search(stopAt);
  return clean(stop >= 0 ? rest.slice(0, stop) : rest);
}

// "200g fusilli • 1 onion, chopped • 2 cloves garlic" -> ["200g fusilli", "1 onion, chopped", ...]
function splitIngredients(text) {
  let items = text.split(/\n/).flatMap((line) => line.split(EMOJI)).flatMap((line) => line.split(BULLETS));
  items = items.map(clean).filter(Boolean);
  // a single run-on line: split on commas, or before each amount ("pasta 1 onion 2 cloves")
  if (items.length === 1) {
    const [only] = items;
    items = only.includes(',') ? only.split(/,\s*/) : only.split(/(?<=\p{L}|\))\s+(?=\d)/u);
  }
  // the last item can run into the next sentence ("cherry tomatoes. ready in 15 min"),
  // but keep abbreviations like "1 tsp. salt"
  const last = items[items.length - 1];
  const sentenceEnd = last ? last.search(/\.\s/) : -1;
  if (sentenceEnd > 0 && last.slice(sentenceEnd + 2).split(' ').length >= 3) items[items.length - 1] = last.slice(0, sentenceEnd);
  return items.map((item) => clean(item.replace(/^[,;:.\s]+|[,;:.\s]+$/g, ''))).filter((item) => item.length > 1 && item.length <= 200);
}

// "1. Boil the pasta 2. Brown the beef 3. Mix" -> ["Boil the pasta", "Brown the beef", "Mix"]
// only numbered steps count (at least two), so "1. Full recipe on my blog!" isn't a method
function splitSteps(text) {
  const parts = text.split(/(?:^|\s)\d{1,2}[.)]\s+/).map(clean).filter(Boolean);
  if (parts.length < 2) return [];
  // the last step runs into the rest of the caption: keep its first sentence
  const last = parts[parts.length - 1];
  const sentenceEnd = last.search(/[.!?](\s|$)/);
  parts[parts.length - 1] = sentenceEnd > 0 ? last.slice(0, sentenceEnd + 1) : last;
  return parts.map((step) => clean(step.replace(EMOJI, ' '))).filter((step) => step.length > 2);
}

// caption -> { title, ingredients: [lines], steps: [lines] }
function readCaption(caption) {
  const text = withoutHashtags(caption);
  const ingredientsText = section(text, INGREDIENTS_HEADING, STEPS_HEADING);
  const stepsText = section(text, STEPS_HEADING, INGREDIENTS_HEADING);
  return {
    title: titleFromCaption(caption),
    ingredients: ingredientsText ? splitIngredients(ingredientsText) : [],
    steps: stepsText ? splitSteps(stepsText) : [],
  };
}

module.exports = { readCaption, titleFromCaption };
