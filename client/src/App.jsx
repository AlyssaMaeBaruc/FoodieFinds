import { useState } from 'react'
import './App.css'

function App() {

  const apiUrl = "https://api.spoonacular.com/recipes/findByIngredients";
  const apiKey ="c5a76b2747564a09b63ee79f924ba472";

  // this is for the users to input their ingredients 
  const [ingredientsInput, setIngredientsInput] = useState("");

  //this is for adding the ingredients the user places
  const [addedIngredients, setAddedIngredients] = useState([]);

  //this is for the recipes when we press submit and find it 
  const [recipes, setRecipes] = useState([]);


  function handleChange(e) {
    setIngredientsInput(e.target.value);
  };

// create a function when we press find recipes button 
  function handleSubmit() {
    getRecipes(setRecipes);
    console.log("Ingredients are submitted")
  };

  // create a function for appending the ingredients when we click the add button 
  function addNewIngredients(e){
    e.preventDefault();
    setAddedIngredients(i => [...i, ingredientsInput]);
    setIngredientsInput("");
  }

  // create a function for delete button whenever the user deletes an ingredient 
  // should come from the array of ingredients the user adds = addedIngredients 
  function deleteIngredients(index) {
    const updatedIngredients = addedIngredients.filter((element, i) => i !== index)
    setAddedIngredients(updatedIngredients);
  }


   //fetch('https://api.spoonacular.com/recipes/findByIngredients?apiKey=c5a76b2747564a09b63ee79f924ba472&ingredients=tomato,+potato')
//   //then check if my fetch worked 

const getRecipes = () => {
 fetch(`${apiUrl}?apiKey=${apiKey}&ingredients=${recipes}`)
  .then(response => response.json())
  .then(response => setRecipes(response))
  .catch(error => 
    console.error(error));
  }
// //dependencies, run this code when i start the app


  return (
    <>
    <h1> Plan your Meal! </h1>
    <form>
    <input type="text" placeholder = "Enter your ingredients" value = {ingredientsInput} onChange = {handleChange} /> 
    <button onClick={(addNewIngredients)}> Add </button>
    </form>
    <div>
      <ul>
        {addedIngredients.map((ingredient, index ) => (
          <ul
            key = {index}> {ingredient}
            <button 
            className = "delete-button" 
            onClick = {() => deleteIngredients(index)}> Delete </button> 
          </ul>
        ))}
      </ul>
      <button onClick = {handleSubmit}> Find Recipes</button>
    </div>
    
    </>
    
  )
}

export default App
