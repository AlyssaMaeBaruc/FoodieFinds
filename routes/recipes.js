var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// POST a new recipe 
router.post('/', async function (req, res, next) {
  // as of now i have a title colum, this could be located in the body 

  try {
    
const { title, image } = req.body; 

const insertRecipe = `INSERT INTO saved_meals (title, image) VALUES ( ${title}, ${image})`
const select = `SELECT * FROM students;`;

await db (insertRecipe);
const result = await db (select);
res.send(result.data);
} catch (err) {
  console.log("Error on saving recipe")
}


});


 

module.exports = router;
