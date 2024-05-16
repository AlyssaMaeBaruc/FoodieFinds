import { useState } from 'react'

function Homepage() {

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

// input type bar to handle change when the add button is clicked 
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

  // function for the favourite button, it expects to receive the title and image when called 
  const saveMeal = (title , image) => {
    fetch ("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify ({title, image})
    })
    .then(response => {
      if (!response.ok) {
        throw new Error ("Failed to save meal");
      }
      // or else i want something to appear to know that it is saved 
      alert("Saved!")
    })
    .catch((error) => {
      setError(error.message);
      console.error(error);
    });
  }

// function for the find recipes submit button
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


  return (
    <> 
    <h2> Find Meals With Your Ingredients 🍽️ </h2>
    <form>
    <input name="text" type="text" className= "search-bar" placeholder = "Enter your ingredients" value = {ingredientsInput} onChange = {handleChange} /> 
    <button onClick={(addNewIngredients)} className= "button"> Add </button>
    </form>
    <div>
      <ul>
        {addedIngredients.map((ingredient, index ) => (
          <ul
            key = {index}> {ingredient}
            <button 
            className = "delete-button" 
            onClick = {() => deleteIngredients(index)}> ✖️ </button> 
          </ul>
        ))}
      </ul>
      <button onClick = {handleSubmit} className= "button" > 🔎 Find Recipes</button>
      <div className= "error-message"> {error &&  
        <h2> ERROR 404 : {error} </h2> } </div>     
      <div className= "recipe-container"> 
      {recipes.map ((recipe, index) => (
        <ul key = {index}> 
          <h4> {recipe.title} </h4>
          <img src = {recipe.image} className= 'image-list' />
          {/* adding a button for every meal that appears  */}
          <button className = "save-button" onClick ={() => saveMeal(recipe.title, recipe.image)} > ❤️ Favourite </button>
        </ul>
     ))}
     
      </div>
    </div>
    
    </>
    
  )
}

export default Homepage
