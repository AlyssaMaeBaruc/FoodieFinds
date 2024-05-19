import React from 'react';

function RecipesList({ recipes, saveMeal, showSaveButton, deleteMeal}) {

  if (!recipes) return null; 
  return (
    <div>
      <ul>
        {recipes.map((recipe, index) => (
          <li key={index}>
            <h4>{recipe.title}</h4>
            <img src={recipe.image} className='image-list' alt={recipe.title} />
            {/* adding a button for every meal that appears  */}
            {showSaveButton && (
        <button className="save-button" onClick={() => saveMeal(recipe.title, recipe.image)}>❤️ Favourite</button>
            )}
        {deleteMeal && (
              <button className = "delete-savedmeals" onClick={() => deleteMeal(recipe.id)}> ✖️ Delete</button>
            )}

          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecipesList;
