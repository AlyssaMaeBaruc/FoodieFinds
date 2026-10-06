import { useState } from 'react'
import RecipesList from '../components/RecipesList'; // Adjust the import path based on your project structure
import { SPOONACULAR_BASE_URL, SPOONACULAR_API_KEY } from '../spoonacular';



function Homepage() {

  const apiUrl = `${SPOONACULAR_BASE_URL}/recipes/findByIngredients`;
  const apiKey = SPOONACULAR_API_KEY;

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
    if (!ingredientsInput.trim()) return;
    setAddedIngredients(i => [...i, ingredientsInput.trim()]);
    setIngredientsInput("");
  }

  // create a function for delete button whenever the user deletes an ingredient 
  // should come from the array of ingredients the user adds = addedIngredients 
  function deleteIngredients(index) {
    const updatedIngredients = addedIngredients.filter((element, i) => i !== index)
    setAddedIngredients(updatedIngredients);
  }

  // function for the favourite button, it expects to receive the title and image when called 
  // returns true/false so the heart button knows whether to show as saved
  const saveMeal = (title, image, spoonacularId) => {
    return fetch("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, image, spoonacular_id: spoonacularId })
    })
      .then(response => {
        // 409 means this recipe is already in favourites, so still show the heart as saved
        if (response.status === 409) return true;
        if (!response.ok) {
          throw new Error("Failed to save meal");
        }
        return true;
      })
      .catch((error) => {
        setError(error.message);
        console.error(error);
        return false;
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
    <main className="page">
    <section className="hero glass">
      <h1 className="hero-title">Find meals with <span>your ingredients</span> 🍽️</h1>
      <p className="hero-text">Welcome to FoodieFinds, your ultimate destination for culinary inspiration!
        Explore a world of delightful meal ideas, all tailored to your pantry's ingredients.</p>
    </section>

    <form className="search-form glass" onSubmit={addNewIngredients}>
      <input name="text" type="text" className="search-bar" placeholder="Enter your ingredients" value={ingredientsInput} onChange={handleChange} />
      <button type="submit" className="btn">Add</button>
    </form>

    <ul className="chips">
      {addedIngredients.map((ingredient, index) => (
        <li key={index} className="chip glass">
          {ingredient}
          <button
            className="chip-remove"
            aria-label={`Remove ${ingredient}`}
            onClick={() => deleteIngredients(index)}>✖️</button>
        </li>
      ))}
    </ul>
    <button onClick={handleSubmit} className="btn btn-accent find-button">🔎 Find Recipes</button>
    {error && <div className="error-message glass">ERROR 404 : {error}</div>}

    <RecipesList recipes={recipes} saveMeal={saveMeal} showSaveButton={true}/>
    </main>

  )
}

export default Homepage
