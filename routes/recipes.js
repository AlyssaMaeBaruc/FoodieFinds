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
    
const { title, image } = req.body; 

const insertSavedRecipe = `INSERT INTO saved_meals (title, image) VALUES ("${title}", "${image}");`

await db (insertSavedRecipe);
res.status(200).send({message: 'Meal have been saved'});
} catch (err) {
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
 

// DELETE SAVED OR FAVORITED MEALS 

router.delete ("/:id", async function(req, res, next) {

  try {
    await db(`DELETE FROM saved_meals WHERE id = ${req.params.id};`);
   
    const result = await db(`SELECT * FROM saved_meals`);

    res.send(result.data);
  } catch (err) {
    res.status(500).send(err);
  }
});



module.exports = router;
