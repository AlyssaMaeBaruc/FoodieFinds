import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import RecipeImage from "../components/RecipeImage";

const capitalize = (name) => name.charAt(0).toUpperCase() + name.slice(1);

// recipe page for a custom recipe (added from a link or by hand)
function MyRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRecipe(null);
    setError(null);
    fetch(`/api/custom-recipes/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load this recipe. Please try again later.");
        return data;
      })
      .then(setRecipe)
      .catch((err) => {
        setError(err.message);
        console.error(err);
      });
  }, [id]);

  return (
    <main className="page">
      <button className="btn btn-ghost back-button" onClick={() => navigate(-1)}>
        <Icon name="arrowLeft" /> Back
      </button>

      {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}
      {!recipe && !error && <p className="empty-state">Loading recipe…</p>}

      {recipe && (
        <article className="recipe-details">
          <header className="recipe-header glass">
            <RecipeImage src={recipe.image} alt={recipe.title} className="recipe-details-image" />
            <div className="recipe-header-text">
              <p className="eyebrow">My recipe</p>
              <h1 className="recipe-details-title">{recipe.title}</h1>
              <div className="recipe-facts">
                <span className="fact"><Icon name="utensils" size={16} /> {recipe.ingredients.length} ingredients</span>
                {recipe.steps.length > 0 && <span className="fact"><Icon name="clock" size={16} /> {recipe.steps.length} steps</span>}
              </div>
              {recipe.source_url && (
                <a className="btn btn-accent source-link" href={recipe.source_url} target="_blank" rel="noreferrer">
                  View original <Icon name="external" size={16} />
                </a>
              )}
            </div>
          </header>

          <div className="recipe-body">
            <section className="recipe-panel ingredients-panel glass">
              <h2 className="recipe-section-title">
                Ingredients <span className="count">{recipe.ingredients.length}</span>
              </h2>
              <ul className="ingredient-list">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    {ingredient.original}
                    {/* the shopping name, when it differs from what was pasted (e.g. Spanish) */}
                    {!ingredient.original.toLowerCase().includes(ingredient.name) && (
                      <span className="ingredient-english">{capitalize(ingredient.name)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="recipe-panel glass">
              <h2 className="recipe-section-title">Instructions</h2>
              {recipe.steps.length > 0 ? (
                <div className="instructions">
                  <ol className="step-list">
                    {recipe.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="recipe-note">
                  No steps saved for this recipe.{recipe.source_url && " Use View original to see the full method."}
                </p>
              )}
            </section>
          </div>
        </article>
      )}
    </main>
  );
}

export default MyRecipe;
