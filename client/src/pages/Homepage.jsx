import { useState } from 'react'
import RecipesList from '../components/RecipesList'; // Adjust the import path based on your project structure
import { SPOONACULAR_BASE_URL, SPOONACULAR_API_KEY } from '../spoonacular';
import Icon from '../components/Icon';

// cuisines Spoonacular's recipe search can filter by
const CUISINES = [
  "African", "American", "Asian", "British", "Cajun", "Caribbean", "Chinese",
  "Eastern European", "European", "French", "German", "Greek", "Indian", "Irish",
  "Italian", "Japanese", "Jewish", "Korean", "Latin American", "Mediterranean",
  "Mexican", "Middle Eastern", "Nordic", "Southern", "Spanish", "Thai", "Vietnamese",
];

// recipes per page of results (each search or "Load more" costs about 1 quota point)
const PAGE_SIZE = 24;

function Homepage() {

  const apiUrl = `${SPOONACULAR_BASE_URL}/recipes/complexSearch`;
  const apiKey = SPOONACULAR_API_KEY;

  // this is for the users to input their ingredients 
  const [ingredientsInput, setIngredientsInput] = useState("");

  //this is for adding the ingredients the user places
  const [addedIngredients, setAddedIngredients] = useState([]);

  //this is for the recipes when we press submit and find it 
  const [recipes, setRecipes] = useState([]);

  //for error 
  const [error,setError] = useState(null);

  // cuisine filter ("" = any), and paging through results
  const [cuisine, setCuisine] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  // the search the current results came from, so "Load more" continues it
  // even if the ingredients or cuisine were changed afterwards
  const [lastSearch, setLastSearch] = useState(null);
  const [searching, setSearching] = useState(false);

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
    if (addedIngredients.length === 0 && !cuisine) {
      setError("Add an ingredient or pick a cuisine first.");
      return;
    }
    getRecipes({ ingredients: addedIngredients, cuisine }, 0);
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

// searches Spoonacular's full recipe database; offset > 0 adds the next page ("Load more")
  const getRecipes = async (search, offset) => {
    const params = new URLSearchParams({ apiKey, number: PAGE_SIZE, offset });
    if (search.ingredients.length > 0) {
      params.set("includeIngredients", search.ingredients.join(","));
      // recipes using the most of your ingredients first
      params.set("sort", "max-used-ingredients");
    } else {
      params.set("sort", "popularity");
    }
    if (search.cuisine) params.set("cuisine", search.cuisine);

    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}?${params}`);
      if (response.status === 402) throw new Error("Daily recipe limit reached. Please try again tomorrow.");
      if (!response.ok) throw new Error("Couldn't search recipes right now. Please try again later.");
      const data = await response.json();

      if (offset === 0 && data.results.length === 0) {
        setRecipes([]);
        setTotalResults(0);
        throw new Error("No recipes found. Try fewer ingredients or another cuisine.");
      }
      setRecipes((current) => (offset === 0 ? data.results : [...current, ...data.results]));
      setTotalResults(data.totalResults);
      setLastSearch(search);
    } catch (error) {
      setError(error.message);
      console.error(error);
    } finally {
      setSearching(false);
    }
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
    <div className="cuisine-picker">
      <p className="cuisine-label">Cuisine</p>
      <div className="cuisine-chips" role="radiogroup" aria-label="Cuisine">
        {["", ...CUISINES].map((name) => (
          <button
            key={name || "any"}
            type="button"
            role="radio"
            aria-checked={cuisine === name}
            className={`cuisine-chip${cuisine === name ? " is-active" : ""}`}
            onClick={() => setCuisine(name)}
          >
            {name || "Any"}
          </button>
        ))}
      </div>
    </div>

    <button onClick={handleSubmit} className="btn btn-accent find-button" disabled={searching && recipes.length === 0}>
      <Icon name="search" size={18} /> {searching && recipes.length === 0 ? "Searching…" : "Find recipes"}
    </button>
    {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}

    {recipes.length > 0 && (
      <p className="results-meta">
        Showing <strong>{recipes.length}</strong> of {totalResults.toLocaleString("en-GB")} recipes
        {lastSearch?.cuisine && <> · {lastSearch.cuisine}</>}
      </p>
    )}

    <RecipesList recipes={recipes} saveMeal={saveMeal} showSaveButton={true}/>

    {recipes.length > 0 && recipes.length < totalResults && (
      <button className="btn btn-ghost load-more" onClick={() => getRecipes(lastSearch, recipes.length)} disabled={searching}>
        {searching ? "Loading…" : <>Load more recipes <Icon name="arrowRight" size={16} /></>}
      </button>
    )}
    </main>

  )
}

export default Homepage
