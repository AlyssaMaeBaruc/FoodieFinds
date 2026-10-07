var express = require('express');
var router = express.Router();
const db = require('../model/helper');


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


// GET ALL THE FAVOURITED OR SAVED MEALS 

router.get("/", async function(req, res, next) {

  db("SELECT * FROM saved_meals;")
    .then((results) => {
      res.send(results.data);
    })
    .catch((err) => res.status(500).send(err));
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
