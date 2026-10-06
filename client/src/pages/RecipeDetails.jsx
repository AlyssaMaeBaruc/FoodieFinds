import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SPOONACULAR_BASE_URL, SPOONACULAR_API_KEY } from "../spoonacular";

// full recipe page: ingredients, steps and a link to the original
function RecipeDetails() {
  // :id in the URL is the Spoonacular recipe ID
  const { id } = useParams();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRecipe(null);
    setError(null);
    fetch(`${SPOONACULAR_BASE_URL}/recipes/${id}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`)
      .then((response) => {
        // 402 = daily Spoonacular limit used up
        if (response.status === 402) throw new Error("Daily recipe limit reached. Please try again tomorrow.");
        if (!response.ok) throw new Error("Couldn't load this recipe. Please try again later.");
        return response.json();
      })
      .then((data) => setRecipe(data))
      .catch((error) => {
        setError(error.message);
        console.error(error);
      });
  }, [id]);

  // Spoonacular splits instructions into sections; flatten them into one list of steps
  const steps = recipe?.analyzedInstructions?.flatMap((section) => section.steps) ?? [];

  return (
    <main className="page">
      <button className="btn btn-ghost back-button" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="error-message glass">{error}</div>}
      {!recipe && !error && <p className="empty-state">Loading recipe…</p>}

      {recipe && (
        <article className="recipe-details glass">
          <img className="recipe-details-image" src={recipe.image} alt={recipe.title} />

          <div className="recipe-details-body">
            <h1 className="recipe-details-title">{recipe.title}</h1>

            <div className="recipe-facts">
              {recipe.readyInMinutes > 0 && <span className="fact">⏱️ {recipe.readyInMinutes} min</span>}
              {recipe.servings > 0 && <span className="fact">🍽️ {recipe.servings} servings</span>}
            </div>

            <section>
              <h2 className="recipe-section-title">Ingredients</h2>
              <ul className="ingredient-list">
                {recipe.extendedIngredients?.map((ingredient, index) => (
                  <li key={index}>{ingredient.original}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="recipe-section-title">Instructions</h2>
              {steps.length > 0 ? (
                <ol className="step-list">
                  {steps.map((step, index) => (
                    <li key={index}>{step.step}</li>
                  ))}
                </ol>
              ) : (
                <p className="recipe-note">No step-by-step instructions for this one. See the original recipe below.</p>
              )}
            </section>

            {recipe.sourceUrl && (
              <a className="btn btn-accent source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                View original recipe ↗
              </a>
            )}
          </div>
        </article>
      )}
    </main>
  );
}

export default RecipeDetails;
