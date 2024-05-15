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

  //for error 
  const [error,setError] = useState(null);


  function handleChange(e) {
    setIngredientsInput(e.target.value);
  };

// create a function when we press find recipes button 
  function handleSubmit() {
    getRecipes();
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
 fetch(`${apiUrl}?apiKey=${apiKey}&ingredients=${addedIngredients.join(",")}`)
  .then((response) => {
    // this is if there is something wrong with the database 
    if(!response.ok) {
      throw new Error ("please try again later");
    }
    return response.json();
  })
  // placed an error for cases where the response could not be read or does not match the expected 
  .then((response) => {
    console.log(response);
    if (!Array.isArray(response) || response.length === 0) {
      throw new Error("Invalid Ingredient"); 
};
// else if it contains data that can be read then clear the error 
  setRecipes(response);
  setError(null);
  })
  .catch((error) => {
    setError(error.message);
    console.error(error);
  });

};

  // const getRecipes = () => {
  //   fetch(`${apiUrl}?apiKey=${apiKey}&ingredients=${addedIngredients.join(",")}`)
  // // .then(response => response.json())
  // // .then(response => setRecipes(response))
  // // .catch(error => 
  // //   console.error(error));
  // // }


  return (
    <>
    <h2> Find Meals With Your Ingredients </h2>
    <form>
    <input type="text" className= "search-bar" placeholder = "Enter your ingredients" value = {ingredientsInput} onChange = {handleChange} /> 
    <button onClick={(addNewIngredients)} className= "button"> Add </button>
    </form>
    <div>
      <ul>
        {addedIngredients.map((ingredient, index ) => (
          <ul
            key = {index}> {ingredient}
            <button 
            className = "delete-button" 
            onClick = {() => deleteIngredients(index)}> x </button> 
          </ul>
        ))}
      </ul>
      <button onClick = {handleSubmit} className= "button" > Find Recipes</button>
      <div className= "error-message"> {error &&  
        <h2> ERROR 404 : {error} </h2> } </div>     
      <div className= "recipe-container"> 
      {recipes.map ((recipe, index) => (
        <ul key = {index}> 
          <h4> {recipe.title} </h4>
          <img src = {recipe.image} className= 'image-list' />
        </ul>
     ))}
      </div>
    </div>
    
    </>
    
  )
}

export default App
