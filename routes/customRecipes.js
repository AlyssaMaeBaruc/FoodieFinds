var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { spoonacular, SpoonacularError } = require('../model/spoonacular');
const { translateLine, buildDictionary } = require('../model/translateIngredient');
const builtInDictionary = require('../model/spanishDictionary');

// a link counts as failed when the page title looks like an error page
const ERROR_TITLE = /\b(error|404|403|not found|page not found|access denied|forbidden|no encontrad[ao]|no existe|se ha producido un error|just a moment|captcha)\b/i;

const MAX_LINES = 80;
const isHttpUrl = (text) => /^https?:\/\/\S+$/i.test(text || '');

// a message the app can show, plus a status code
class InputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendError(res, err, what) {
  if (err instanceof InputError || err instanceof SpoonacularError) {
    return res.status(err.status).send({ message: err.message });
  }
  console.error(`Error ${what}`, err);
  res.status(500).send({ message: `Something went wrong ${what}. Please try again.` });
}

// built-in Spanish words + the ones taught in the review step
async function loadDictionary() {
  const learned = await db('SELECT spanish, english FROM ingredient_translations;');
  return buildDictionary(builtInDictionary, learned.data);
}

// a Spoonacular ingredient counts as recognized when it has a real id and aisle
const isRecognized = (ingredient) =>
  Boolean(ingredient) && Number.isInteger(ingredient.id) && ingredient.id > 0 && ingredient.aisle && ingredient.aisle !== '?';

// reads pasted lines: translate Spanish, then ONE parseIngredients call for all of them.
// Spoonacular may return them in a different order, so results are matched by text.
async function parseLines(lines, dictionary) {
  const translated = lines.map((line) => ({ original: line, ...translateLine(line, dictionary) }));
  const toSend = [...new Set(translated.map((t) => t.english))];

  const parsed = await spoonacular('/recipes/parseIngredients', {
    form: { ingredientList: toSend.join('\n'), servings: 1, includeNutrition: false },
  });
  const byText = new Map(parsed.map((p) => [String(p.original || '').trim().toLowerCase(), p]));

  return translated.map((t) => {
    const match = byText.get(t.english.trim().toLowerCase());
    return draftIngredient(t, isRecognized(match) ? match : null);
  });
}

// the shape the review screen shows and the save route stores
function draftIngredient(translation, match) {
  return {
    original: translation.original,
    core: translation.core,              // Spanish key for learning a translation
    english: translation.english,
    translated: translation.translated,
    recognized: Boolean(match),
    name: match ? (match.nameClean || match.name) : (translation.translated ? translation.english : translation.core || translation.original),
    ingredient_id: match ? match.id : null,
    aisle: match ? match.aisle : null,
    image: match ? match.image || null : null,
  };
}

// steps from Spoonacular's analysis, or from the page's own instructions text
function extractSteps(recipe) {
  const analyzed = (recipe.analyzedInstructions || []).flatMap((section) => section.steps.map((s) => s.step));
  if (analyzed.length > 0) return analyzed.map((s) => s.trim()).filter(Boolean);

  const html = recipe.instructions || '';
  return html
    .replace(/<\/(li|p|div|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// IMPORT A RECIPE FROM A LINK -> a draft to review (nothing is saved yet)
router.post('/extract', async function (req, res) {
  const url = (req.body.url || '').trim();
  if (!isHttpUrl(url) || url.length > 1000) {
    return res.status(400).send({ failed: true, message: 'Please paste a full link starting with http:// or https://' });
  }

  let recipe;
  try {
    recipe = await spoonacular('/recipes/extract', {
      query: { url, forceExtraction: true, analyze: true },
      timeoutMs: 20000,
    });
  } catch (err) {
    // errors and timeouts count as a failed link: the app switches to the manual form
    const message = err instanceof SpoonacularError ? err.message : "Couldn't read that link.";
    return res.status(422).send({ failed: true, message });
  }

  const ingredients = recipe.extendedIngredients || [];
  if (!recipe.title || ingredients.length === 0 || ERROR_TITLE.test(recipe.title)) {
    return res.status(422).send({ failed: true, message: "Couldn't find a recipe at that link." });
  }

  try {
    // keep what Spoonacular understood; translate and re-read the rest in one extra call
    const lines = ingredients.slice(0, MAX_LINES).map((i) => (i.original || i.name || '').trim()).filter(Boolean);
    const dictionary = await loadDictionary();
    const unrecognized = ingredients.slice(0, MAX_LINES).filter((i) => !isRecognized(i)).map((i) => (i.original || i.name || '').trim()).filter(Boolean);
    const reparsed = unrecognized.length > 0 ? await parseLines(unrecognized, dictionary) : [];
    const reparsedByLine = new Map(reparsed.map((r) => [r.original, r]));

    const drafts = ingredients.slice(0, MAX_LINES).map((i) => {
      const line = (i.original || i.name || '').trim();
      if (isRecognized(i)) {
        return draftIngredient({ original: line, ...translateLine(line, dictionary) }, i);
      }
      return reparsedByLine.get(line);
    }).filter(Boolean);

    res.send({
      title: recipe.title.trim(),
      image: recipe.image || null,
      source_url: url,
      steps: extractSteps(recipe),
      ingredients: drafts,
    });
  } catch (err) {
    // the recipe was found but reading its ingredients failed: still send the user to the manual form
    const message = err instanceof SpoonacularError ? err.message : "Couldn't read the ingredients from that link.";
    res.status(422).send({ failed: true, message });
  }
});

// READ PASTED INGREDIENT LINES (manual form, and "Recheck" in the review step)
router.post('/parse', async function (req, res) {
  try {
    const lines = Array.isArray(req.body.lines)
      ? req.body.lines.map((l) => String(l).trim()).filter(Boolean)
      : [];
    if (lines.length === 0) throw new InputError(400, 'Add at least one ingredient, one per line.');
    if (lines.length > MAX_LINES) throw new InputError(400, `Please keep it to ${MAX_LINES} ingredients or fewer.`);
    if (lines.some((l) => l.length > 500)) throw new InputError(400, 'One of the ingredient lines is too long.');

    const dictionary = await loadDictionary();
    res.send({ ingredients: await parseLines(lines, dictionary) });
  } catch (err) {
    sendError(res, err, 'reading the ingredients');
  }
});

// SAVE A CUSTOM RECIPE (and any Spanish -> English words taught in the review step)
router.post('/', async function (req, res) {
  try {
    const title = String(req.body.title || '').trim();
    const image = String(req.body.image || '').trim() || null;
    const sourceUrl = String(req.body.source_url || '').trim() || null;
    const steps = (Array.isArray(req.body.steps) ? req.body.steps : []).map((s) => String(s).trim()).filter(Boolean);
    const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
    const learned = Array.isArray(req.body.learned) ? req.body.learned : [];

    if (!title || title.length > 255) throw new InputError(400, 'Give the recipe a name (up to 255 characters).');
    if (image && (!isHttpUrl(image) || image.length > 500)) throw new InputError(400, 'The image must be a link starting with http:// or https://');
    if (sourceUrl && (!isHttpUrl(sourceUrl) || sourceUrl.length > 1000)) throw new InputError(400, 'The source must be a link starting with http:// or https://');
    if (steps.length > 60 || steps.some((s) => s.length > 2000)) throw new InputError(400, 'Too many or too long steps.');
    if (ingredients.length === 0 || ingredients.length > MAX_LINES) throw new InputError(400, `Add between 1 and ${MAX_LINES} ingredients.`);

    const rows = ingredients.map((i, position) => {
      const original = String(i.original || '').trim().slice(0, 500);
      const name = String(i.name || '').trim().toLowerCase().slice(0, 255);
      if (!original || !name) throw new InputError(400, 'Every ingredient needs a name.');
      const ingredientId = Number.isInteger(i.ingredient_id) && i.ingredient_id > 0 ? i.ingredient_id : null;
      return [position, original, name, ingredientId, i.aisle ? String(i.aisle).slice(0, 100) : null, i.image ? String(i.image).slice(0, 255) : null];
    });
    const pairs = learned
      .map((p) => [String(p.spanish || '').trim().toLowerCase().slice(0, 255), String(p.english || '').trim().toLowerCase().slice(0, 255)])
      .filter(([spanish, english]) => spanish && english && spanish !== english);

    // all or nothing: the recipe, its ingredients and the learned words
    const statements = [
      'START TRANSACTION;',
      'INSERT INTO saved_meals (title, image, source_url, steps, is_custom) VALUES (?, ?, ?, ?, TRUE);',
      'SET @meal_id = LAST_INSERT_ID();',
      `INSERT INTO custom_ingredients (saved_meal_id, position, original, name, ingredient_id, aisle, image) VALUES ${rows.map(() => '(@meal_id, ?, ?, ?, ?, ?, ?)').join(', ')};`,
    ];
    const params = [title, image, sourceUrl, JSON.stringify(steps), ...rows.flat()];
    if (pairs.length > 0) {
      statements.push(
        `INSERT INTO ingredient_translations (spanish, english) VALUES ${pairs.map(() => '(?, ?)').join(', ')} AS new
         ON DUPLICATE KEY UPDATE english = new.english;`
      );
      params.push(...pairs.flat());
    }
    statements.push('SELECT @meal_id AS id;', 'COMMIT;');

    const result = await db(statements.join('\n'), params);
    // the SELECT's rows are the one array among the statement results
    const idRow = result.data.find((r) => Array.isArray(r))?.[0];
    res.status(201).send({ id: idRow ? Number(idRow.id) : null, message: 'Recipe saved' });
  } catch (err) {
    sendError(res, err, 'saving the recipe');
  }
});

// ONE CUSTOM RECIPE, for the recipe page
router.get('/:id', async function (req, res) {
  try {
    const meal = await db('SELECT id, title, image, source_url, steps FROM saved_meals WHERE id = ? AND is_custom = TRUE;', [req.params.id]);
    if (meal.data.length === 0) throw new InputError(404, 'Recipe not found.');
    const ingredients = await db(
      'SELECT original, name, aisle FROM custom_ingredients WHERE saved_meal_id = ? ORDER BY position;',
      [req.params.id]
    );
    const recipe = meal.data[0];
    res.send({
      ...recipe,
      steps: typeof recipe.steps === 'string' ? JSON.parse(recipe.steps) : recipe.steps || [],
      ingredients: ingredients.data,
    });
  } catch (err) {
    sendError(res, err, 'loading the recipe');
  }
});

module.exports = router;
