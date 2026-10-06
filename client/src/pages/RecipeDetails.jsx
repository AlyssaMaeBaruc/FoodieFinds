import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SPOONACULAR_BASE_URL, SPOONACULAR_API_KEY } from "../spoonacular";
import Icon from "../components/Icon";

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
      <button className="btn btn-ghost back-button" onClick={() => navigate(-1)}>
        <Icon name="arrowLeft" /> Back
      </button>

      {error && <div className="error-message glass">{error}</div>}
      {!recipe && !error && <p className="empty-state">Loading recipe…</p>}

      {recipe && (
        <article className="recipe-details">
          <header className="recipe-header glass">
            <img className="recipe-details-image" src={recipe.image} alt={recipe.title} />
            <div className="recipe-header-text">
              <p className="eyebrow">Recipe</p>
              <h1 className="recipe-details-title">{recipe.title}</h1>
              <div className="recipe-facts">
                {recipe.readyInMinutes > 0 && (
                  <span className="fact"><Icon name="clock" size={16} /> {recipe.readyInMinutes} min</span>
                )}
                {recipe.servings > 0 && (
                  <span className="fact"><Icon name="utensils" size={16} /> {recipe.servings} servings</span>
                )}
              </div>
              {recipe.sourceUrl && (
                <a className="btn btn-accent source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                  View original recipe <Icon name="external" size={16} />
                </a>
              )}
            </div>
          </header>

          <div className="recipe-body">
            <section className="recipe-panel ingredients-panel glass">
              <h2 className="recipe-section-title">
                Ingredients <span className="count">{recipe.extendedIngredients?.length ?? 0}</span>
              </h2>
              <ul className="ingredient-list">
                {recipe.extendedIngredients?.map((ingredient, index) => (
                  <li key={index}>{ingredient.original}</li>
                ))}
              </ul>
            </section>

            <section className="recipe-panel glass">
              <h2 className="recipe-section-title">Instructions</h2>
              {steps.length > 0 ? (
                <ol className="step-list">
                  {steps.map((step, index) => (
                    <li key={index}>{step.step}</li>
                  ))}
                </ol>
              ) : (
                <p className="recipe-note">No step-by-step instructions for this one. Use the original recipe link above.</p>
              )}
            </section>
          </div>
        </article>
      )}
    </main>
  );
}

export default RecipeDetails;
