var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// POST a new recipe 
router.post('/', function (req, res, next) {
  // as of now i have a title colum, this could be located in the body 
const { title, image } = req.body; 

const sql = `INSERT INTO saved_meals (title, image) VALUES ( ${title}, ${image})`


  const newSavedRecipe = {
    id: newSavedRecipeId,
    ...req.body,
  };
  newSavedRecipeId++;

  DataTransfer.push(newSavedRecipe);
  res.status(201).send(data);
});

module.exports = router;
