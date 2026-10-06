import { useState } from 'react'
import RecipesList from '../components/RecipesList'; // Adjust the import path based on your project structure
import { SPOONACULAR_BASE_URL, SPOONACULAR_API_KEY } from '../spoonacular';
import Icon from '../components/Icon';



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

  // for checking typed ingredients before they are added
  const [ingredientError, setIngredientError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [checkingIngredient, setCheckingIngredient] = useState(false);

// input type bar to handle change when the add button is clicked 
  function handleChange(e) {
    setIngredientsInput(e.target.value);
    setIngredientError(null);
    setSuggestions([]);
  };

// create a function when we press find recipes button
  function handleSubmit() {
    getRecipes();
    console.log("Ingredients are submitted")
  };

  // escape regex characters so ingredients like "half & half" match literally
  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // asks Spoonacular whether the typed ingredient exists.
  // valid when it appears as a whole word in a known ingredient ("chicken" matches "chicken leg"),
  // so typos like "chiken" or "banan" are rejected; close matches come back as suggestions
  async function checkIngredient(ingredient) {
    const response = await fetch(
      `${SPOONACULAR_BASE_URL}/food/ingredients/autocomplete?apiKey=${apiKey}&number=5&query=${encodeURIComponent(ingredient)}`
    );
    if (!response.ok) throw new Error("Couldn't check that ingredient. Please try again.");
    const matches = (await response.json()).map((match) => match.name);
    const wholeWord = new RegExp(`(^|\\s)${escapeRegExp(ingredient)}(\\s|$)`, "i");
    return { isValid: matches.some((name) => wholeWord.test(name)), matches };
  }

  function addIngredient(ingredient) {
    setAddedIngredients(i => [...i, ingredient]);
    setIngredientsInput("");
    setIngredientError(null);
    setSuggestions([]);
  }

  // create a function for appending the ingredients when we click the add button 
  async function addNewIngredients(e){
    e.preventDefault();
    const ingredient = ingredientsInput.trim().toLowerCase();
    if (!ingredient || checkingIngredient) return;

    if (addedIngredients.includes(ingredient)) {
      setIngredientError(`"${ingredient}" is already in your list.`);
      return;
    }

    setCheckingIngredient(true);
    try {
      const { isValid, matches } = await checkIngredient(ingredient);
      if (isValid) {
        addIngredient(ingredient);
      } else {
        setIngredientError(`We couldn't find "${ingredient}". Check the spelling and try again.`);
        setSuggestions(matches.filter((name) => !addedIngredients.includes(name)).slice(0, 3));
      }
    } catch (error) {
      setIngredientError(error.message);
      console.error(error);
    } finally {
      setCheckingIngredient(false);
    }
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
    <section className="hero">
      <p className="eyebrow">Pantry-first recipes</p>
      <h1 className="hero-title">Find meals with <span>your ingredients</span></h1>
    </section>

    <form className="search-form glass" onSubmit={addNewIngredients}>
      <Icon name="search" size={20} className="search-icon" />
      <input name="text" type="text" className="search-bar" placeholder="Enter your ingredients" value={ingredientsInput} onChange={handleChange} />
      <button type="submit" className="btn" disabled={checkingIngredient}>
        {checkingIngredient ? "Checking…" : <><Icon name="plus" size={16} /> Add</>}
      </button>
    </form>

    {ingredientError && (
      <div className="ingredient-error glass" role="alert">
        <p><Icon name="alert" size={18} /> {ingredientError}</p>
        {suggestions.length > 0 && (
          <div className="suggestions">
            <span>Did you mean:</span>
            {suggestions.map((name) => (
              <button key={name} type="button" className="suggestion" onClick={() => addIngredient(name)}>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    )}

    <ul className="chips">
      {addedIngredients.map((ingredient, index) => (
        <li key={index} className="chip glass">
          {ingredient}
          <button
            className="chip-remove"
            aria-label={`Remove ${ingredient}`}
            onClick={() => deleteIngredients(index)}><Icon name="x" size={14} /></button>
        </li>
      ))}
    </ul>
    <button onClick={handleSubmit} className="btn btn-accent find-button"><Icon name="search" size={18} /> Find recipes</button>
    {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}

    <RecipesList recipes={recipes} saveMeal={saveMeal} showSaveButton={true}/>
    </main>

  )
}

export default Homepage
