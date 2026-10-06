import React, { useState } from 'react';
import RecipeCard from './RecipeCard';

// renderActions(recipe) lets a page add its own buttons to each card
function RecipesList({ recipes, saveMeal, showSaveButton, deleteMeal, renderActions }) {
  // titles saved during this visit, so the heart stays filled
  const [savedTitles, setSavedTitles] = useState([]);

  const handleSave = async (recipe) => {
    const ok = await saveMeal(recipe.title, recipe.image, recipe.id);
    if (ok) setSavedTitles(t => [...t, recipe.title]);
  };

  if (!recipes) return null;
  return (
    <ul className="recipe-grid">
      {recipes.map((recipe, index) => {
        // saved meals carry spoonacular_id (their own id is the database row); search results use id
        const spoonacularId = "spoonacular_id" in recipe ? recipe.spoonacular_id : recipe.id;
        const actions = renderActions?.(recipe);
        return (
          <RecipeCard
            key={index}
            title={recipe.title}
            image={recipe.image}
            spoonacularId={spoonacularId}
            onSave={showSaveButton ? () => handleSave(recipe) : null}
            isSaved={savedTitles.includes(recipe.title)}
          >
            {(actions || deleteMeal) && (
              <>
                {actions}
                {deleteMeal && (
                  <button className="btn btn-ghost" onClick={() => deleteMeal(recipe.id)}>✖️ Delete</button>
                )}
              </>
            )}
          </RecipeCard>
        );
      })}
    </ul>
  );
}

export default RecipesList;
