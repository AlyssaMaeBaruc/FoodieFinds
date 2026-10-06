import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// photo card used by search results, saved meals and the weekly plan.
// `meta` is a small line under the title (e.g. portions); `children` are the buttons below it;
// `mediaAction` is an extra round button on the photo (e.g. delete).
function RecipeCard({ title, image, spoonacularId, onSave, isSaved, compact = false, as: Tag = "li", meta, mediaAction, children }) {
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
            <Icon name="heart" size={20} />
          </button>
        )}
        {mediaAction}
      </div>
      <h4>{recipeLink ? <Link to={recipeLink} className="recipe-title-link">{title}</Link> : title}</h4>
      {meta && <p className="card-meta">{meta}</p>}
      {children && <div className="card-actions">{children}</div>}
    </Tag>
  );
}

export default RecipeCard;
