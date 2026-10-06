import React from 'react';
import { Link } from 'react-router-dom';

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3.1 1.6-1.9 3-3.1 5.2-3.1 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

// photo card used by search results, saved meals and the weekly plan.
// `meta` is a small line under the title (e.g. portions); `children` are the buttons below it.
function RecipeCard({ title, image, spoonacularId, onSave, isSaved, compact = false, as: Tag = "li", meta, children }) {
  const recipeLink = spoonacularId ? `/recipe/${spoonacularId}` : null;

  return (
    <Tag className={`recipe-card glass${compact ? " is-compact" : ""}`}>
      <div className="card-media">
        {recipeLink ? (
          <Link to={recipeLink} aria-label={`View recipe for ${title}`}>
            <img src={image} alt={title} />
          </Link>
        ) : (
          <img src={image} alt={title} />
        )}
        {/* adding a favourite button for every meal that appears  */}
        {onSave && (
          <button
            className={`fav-button${isSaved ? " is-saved" : ""}`}
            onClick={onSave}
            disabled={isSaved}
            aria-label={isSaved ? `${title} saved` : `Save ${title} to favourites`}
            title={isSaved ? "Saved" : "Save to favourites"}
          >
            <HeartIcon />
          </button>
        )}
      </div>
      <h4>{recipeLink ? <Link to={recipeLink} className="recipe-title-link">{title}</Link> : title}</h4>
      {meta && <p className="card-meta">{meta}</p>}
      {children && <div className="card-actions">{children}</div>}
    </Tag>
  );
}

export default RecipeCard;
