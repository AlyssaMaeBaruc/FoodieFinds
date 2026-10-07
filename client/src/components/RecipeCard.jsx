import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import RecipeImage from './RecipeImage';

// photo card used by search results, saved meals and the weekly plan.
// `meta` is a small line under the title (e.g. portions); `children` are the buttons below it;
// `mediaAction` is an extra round button on the photo (e.g. delete); `badge` sits next to the title
// (e.g. the health grade), off the photo so it's always readable.
// `link` overrides where the card goes (custom recipes open /my-recipe/:id).
// `onSelect` turns the whole card into a checkbox (select mode): tapping selects it
// instead of opening the recipe, and `selected` shows whether it's ticked.
function RecipeCard({ title, image, spoonacularId, link, onSave, isSaved, compact = false, as: Tag = "li", meta, mediaAction, badge, onSelect, selected = false, className = "", children }) {
  const selecting = Boolean(onSelect);
  const recipeLink = selecting ? null : link ?? (spoonacularId ? `/recipe/${spoonacularId}` : null);

  const selectProps = selecting
    ? {
        role: "checkbox",
        "aria-checked": selected,
        "aria-label": title,
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onSelect();
          }
        },
      }
    : {};

  return (
    <Tag
      className={`recipe-card glass${compact ? " is-compact" : ""}${selecting ? " is-selectable" : ""}${selected ? " is-selected" : ""} ${className}`}
      {...selectProps}
    >
      <div className="card-media">
        {selecting && (
          <span className="select-badge" aria-hidden="true">
            <Icon name="check" size={16} />
          </span>
        )}
        {recipeLink ? (
          <Link to={recipeLink} aria-label={`View recipe for ${title}`}>
            <RecipeImage src={image} alt={title} />
          </Link>
        ) : (
          <RecipeImage src={image} alt={title} />
        )}
        {/* adding a favourite button for every meal that appears  */}
        {onSave && !selecting && (
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
        {!selecting && mediaAction}
      </div>
      <div className="card-title-row">
        <h4>{recipeLink ? <Link to={recipeLink} className="recipe-title-link">{title}</Link> : title}</h4>
        {badge && <span className="card-badge">{badge}</span>}
      </div>
      {meta && <p className="card-meta">{meta}</p>}
      {children && !selecting && <div className="card-actions">{children}</div>}
    </Tag>
  );
}

export default RecipeCard;
