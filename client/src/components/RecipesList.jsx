import React, { useState } from 'react';

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3.1 1.6-1.9 3-3.1 5.2-3.1 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function RecipesList({ recipes, saveMeal, showSaveButton, deleteMeal}) {
  // titles saved during this visit, so the heart stays filled
  const [savedTitles, setSavedTitles] = useState([]);

  const handleSave = async (recipe) => {
    const ok = await saveMeal(recipe.title, recipe.image);
    if (ok) setSavedTitles(t => [...t, recipe.title]);
  };

  if (!recipes) return null;
  return (
    <ul className="recipe-grid">
      {recipes.map((recipe, index) => {
        const isSaved = savedTitles.includes(recipe.title);
        return (
          <li key={index} className="recipe-card glass">
            <div className="card-media">
              <img src={recipe.image} alt={recipe.title} />
              {/* adding a favourite button for every meal that appears  */}
              {showSaveButton && (
                <button
                  className={`fav-button${isSaved ? " is-saved" : ""}`}
                  onClick={() => handleSave(recipe)}
                  disabled={isSaved}
                  aria-label={isSaved ? `${recipe.title} saved` : `Save ${recipe.title} to favourites`}
                  title={isSaved ? "Saved" : "Save to favourites"}
                >
                  <HeartIcon />
                </button>
              )}
            </div>
            <h4>{recipe.title}</h4>
            {deleteMeal && (
              <button className="btn btn-ghost" onClick={() => deleteMeal(recipe.id)}>✖️ Delete</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default RecipesList;
