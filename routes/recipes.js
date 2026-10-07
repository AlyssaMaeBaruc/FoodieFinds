var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { suggestTagsForMeals, tagsByMeal } = require('../model/mealTags');
const { fillMissingHealthScores } = require('../model/healthScores');
const { GRADES, withGrade, HEALTH_COLUMNS, HEALTH_JOIN } = require('../model/healthGrade');

// every saved meal with its health score (Spoonacular's, or estimated for custom recipes)
const savedMealsWithScores = () => db(
  `SELECT sm.id, sm.title, sm.image, sm.spoonacular_id, sm.source_url, sm.steps, sm.is_custom,
          sm.tags_suggested, sm.health_checked, ${HEALTH_COLUMNS}
   FROM saved_meals sm ${HEALTH_JOIN} ORDER BY sm.id;`
);


// /* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

// POST a new recipe 
router.post('/', async function (req, res, next) {
  // as of now i have a title colum, this could be located in the body 

  try {
    
const { title, image, spoonacular_id } = req.body;

// the Spoonacular ID is needed later to fetch the recipe's ingredients
if (!Number.isInteger(spoonacular_id)) {
  return res.status(400).send({ message: 'spoonacular_id must be a whole number' });
}

// placeholders (?) let titles with quotes in them save safely
await db("INSERT INTO saved_meals (title, image, spoonacular_id) VALUES (?, ?, ?);", [title, image, spoonacular_id]);
res.status(200).send({message: 'Meal have been saved'});
} catch (err) {
  // spoonacular_id is UNIQUE, so saving the same recipe again lands here
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).send({ message: 'Meal is already saved' });
  }
console.error('Error on saving recipe', err);
  res.status(500).send(err);
 }
});


// GET ALL THE FAVOURITED OR SAVED MEALS (each with its tags and health grade)

router.get("/", async function(req, res, next) {
  let meals;
  try {
    meals = (await db("SELECT * FROM saved_meals;")).data;
  } catch (err) {
    return res.status(500).send(err);
  }

  // tags and grades are extra: if they fail (e.g. a migration not run yet, or the daily
  // Spoonacular limit), still send the meals; the next visit tries again
  let tags = new Map();
  try {
    // meals saved since the last visit get suggested tags once
    const untagged = meals.filter((meal) => !meal.tags_suggested);
    if (untagged.length > 0) await suggestTagsForMeals(untagged);
    tags = await tagsByMeal();
  } catch (err) {
    console.error('Error loading meal tags', err);
  }
  try {
    await fillMissingHealthScores(meals);
  } catch (err) {
    console.error('Error getting health scores', err.message ?? err);
  }
  try {
    meals = (await savedMealsWithScores()).data.map(withGrade);
  } catch (err) {
    console.error('Error loading health grades', err);
  }
  res.send(meals.map((meal) => ({ ...meal, tags: tags.get(meal.id) ?? [] })));
});

// SET OR CLEAR A MEAL'S GRADE: { grade: "A".."E" } or { grade: null } to use Spoonacular's again
router.put("/:id/grade", async function(req, res) {
  const id = Number(req.params.id);
  const { grade } = req.body;
  if (!Number.isInteger(id) || !(grade === null || GRADES.includes(grade))) {
    return res.status(400).send({ message: 'grade must be A, B, C, D, E or null' });
  }
  try {
    await db('UPDATE saved_meals SET grade_override = ? WHERE id = ?;', [grade, id]);
    const result = await db(`SELECT sm.id, ${HEALTH_COLUMNS} FROM saved_meals sm ${HEALTH_JOIN} WHERE sm.id = ?;`, [id]);
    res.send(withGrade(result.data[0]));
  } catch (err) {
    // the helper rejects when no row changed: the meal is gone, or the grade was already that
    if (err === 'Action not complete') {
      const found = await db('SELECT id FROM saved_meals WHERE id = ?;', [id]).catch(() => ({ data: [] }));
      if (found.data.length === 0) return res.status(404).send({ message: 'That meal is no longer saved' });
      const result = await db(`SELECT sm.id, ${HEALTH_COLUMNS} FROM saved_meals sm ${HEALTH_JOIN} WHERE sm.id = ?;`, [id]);
      return res.send(withGrade(result.data[0]));
    }
    console.error('Error saving meal grade', err);
    res.status(500).send({ message: "Couldn't save the grade. Please try again." });
  }
});

// SET A MEAL'S TAGS: { tag_ids: [1, 4] } (replaces its tags; suggestions never run on it again)
router.put("/:id/tags", async function(req, res) {
  const id = Number(req.params.id);
  const { tag_ids: tagIds } = req.body;
  if (!Number.isInteger(id) || !Array.isArray(tagIds) || tagIds.length > 50 || !tagIds.every(Number.isInteger)) {
    return res.status(400).send({ message: 'tag_ids must be a list of tag ids' });
  }
  const uniqueIds = [...new Set(tagIds)];
  try {
    const statements = [
      'START TRANSACTION;',
      'UPDATE saved_meals SET tags_suggested = TRUE WHERE id = ?;',
      'DELETE FROM meal_tags WHERE saved_meal_id = ?;',
    ];
    const params = [id, id];
    if (uniqueIds.length > 0) {
      // only tags that exist (one may have just been deleted in another tab)
      statements.push('INSERT INTO meal_tags (saved_meal_id, tag_id) SELECT ?, id FROM tags WHERE id IN (?);');
      params.push(id, uniqueIds);
    }
    statements.push('COMMIT;');
    const found = await db('SELECT id FROM saved_meals WHERE id = ?;', [id]);
    if (found.data.length === 0) return res.status(404).send({ message: 'That meal is no longer saved' });
    await db(statements.join('\n'), params);
    const tags = await tagsByMeal();
    res.send({ id, tags: tags.get(id) ?? [] });
  } catch (err) {
    console.error('Error saving meal tags', err);
    res.status(500).send({ message: "Couldn't save the tags. Please try again." });
  }
});
 

// DELETE SEVERAL SAVED MEALS AT ONCE: { ids: [1, 2, 3] }
// (their planned meals and custom ingredients go too, via ON DELETE CASCADE)
router.delete("/", async function(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every(Number.isInteger)) {
    return res.status(400).send({ message: 'ids must be a list of saved meal ids' });
  }
  try {
    // mysql2 expands the array into IN (1, 2, 3)
    await db("DELETE FROM saved_meals WHERE id IN (?);", [ids]);
    res.send({ deleted: ids });
  } catch (err) {
    // the helper rejects when nothing was deleted, e.g. they were already gone
    if (err === 'Action not complete') return res.send({ deleted: [] });
    console.error('Error deleting saved meals', err);
    res.status(500).send({ message: 'Something went wrong deleting those meals. Please try again.' });
  }
});

// DELETE SAVED OR FAVORITED MEALS 

router.delete ("/:id", async function(req, res, next) {

  try {
    await db("DELETE FROM saved_meals WHERE id = ?;", [req.params.id]);
   
    const result = await db(`SELECT * FROM saved_meals`);

    res.send(result.data);
  } catch (err) {
    res.status(500).send(err);
  }
});



module.exports = router;
