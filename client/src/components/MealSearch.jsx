import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import RecipeImage from './RecipeImage';
import GradeBadge from './GradeBadge';
import AddToWeekPicker from './AddToWeekPicker';
import { saveToLibrary, searchLibrary } from '../library';
import { sentenceCase } from '../text';

const LIBRARY_SHOWN = 5;

// "Find a meal" on This Week: search your library (free, as you type) and Spoonacular
// (about 1 point, only when asked), and plan any result straight into the week.
// onPlanned(): something was added to the plan, so the week reloads
function MealSearch({ onPlanned }) {
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState(null);
  const [showAll, setShowAll] = useState(false);
  // Spoonacular results for `searchedFor`
  const [found, setFound] = useState(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [searching, setSearching] = useState(false);
  const [savedIds, setSavedIds] = useState({});   // spoonacular id -> saved meal id
  const [error, setError] = useState(null);

  // your saved meals (with tags and ingredient names), loaded once
  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);

  const q = query.trim();
  const libraryMatches = q.length >= 2 && library ? searchLibrary(library, q) : [];
  const shown = showAll ? libraryMatches : libraryMatches.slice(0, LIBRARY_SHOWN);
  const savedSpoonacularIds = new Set((library ?? []).map((meal) => meal.spoonacular_id).filter(Boolean));

  const searchNew = async (e) => {
    e?.preventDefault();
    if (q.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't search recipes right now.");
      setFound(data.results);
      setSearchedFor(q);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const save = async (recipe) => {
    const id = await saveToLibrary(recipe);
    setSavedIds((current) => ({ ...current, [recipe.id]: id }));
    return id;
  };

  const heart = async (recipe) => {
    try {
      await save(recipe);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="meal-search glass">
      {/* Enter only filters your library; Spoonacular (points) is asked only with the button */}
      <form className="meal-search-bar" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
          placeholder="Find a meal, tag or ingredient"
          aria-label="Find a meal"
        />
      </form>

      {q.length >= 2 && (
        <div className="meal-search-results">
          <h3 className="meal-search-group">
            From your library <span className="count">{libraryMatches.length}</span>
          </h3>
          {libraryMatches.length === 0 ? (
            <p className="meal-search-note">No saved meals match &ldquo;{q}&rdquo;.</p>
          ) : (
            <ul className="meal-search-list">
              {shown.map(({ meal, hint }) => (
                <li key={meal.id} className="meal-search-row">
                  <RecipeImage src={meal.image} />
                  <span className="meal-search-text">
                    <Link
                      to={meal.spoonacular_id ? `/recipe/${meal.spoonacular_id}` : `/my-recipe/${meal.id}`}
                      className="meal-search-title"
                    >
                      {meal.title}
                    </Link>
                    <span className="meal-search-meta">
                      <span className="meal-search-tags">{(meal.tags ?? []).slice(0, 3).map((tag) => sentenceCase(tag.name)).join(" · ")}</span>
                      {hint && <span className="meal-search-hint"> · has {hint}</span>}
                    </span>
                  </span>
                  {meal.grade && <GradeBadge grade={meal.grade} inline />}
                  <div className="meal-search-action">
                    <AddToWeekPicker meal={meal} onAdded={onPlanned} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {libraryMatches.length > LIBRARY_SHOWN && !showAll && (
            <button type="button" className="link-button" onClick={() => setShowAll(true)}>
              Show all {libraryMatches.length}
            </button>
          )}

          <h3 className="meal-search-group">New recipes</h3>
          {found === null || searchedFor !== q ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={searchNew} disabled={searching}>
              <Icon name="search" size={14} /> {searching ? "Searching…" : <>Search new recipes for &ldquo;{q}&rdquo; <span className="cost">~1 point</span></>}
            </button>
          ) : found.length === 0 ? (
            <p className="meal-search-note">No recipes found for &ldquo;{searchedFor}&rdquo;. Try another word.</p>
          ) : (
            <ul className="meal-search-list">
              {found.map((recipe) => {
                const savedId = savedIds[recipe.id];
                const isSaved = Boolean(savedId) || savedSpoonacularIds.has(recipe.id);
                return (
                  <li key={recipe.id} className="meal-search-row">
                    <RecipeImage src={recipe.image} />
                    <span className="meal-search-text">
                      <Link to={`/recipe/${recipe.id}`} className="meal-search-title">{recipe.title}</Link>
                      <span className="meal-search-meta">{isSaved ? "In your library" : "From Spoonacular"}</span>
                    </span>
                    <button
                      type="button"
                      className={`fav-button is-inline${isSaved ? " is-saved" : ""}`}
                      onClick={() => heart(recipe)}
                      disabled={isSaved}
                      aria-pressed={isSaved}
                      aria-label={`Save ${recipe.title}`}
                      title={isSaved ? "Saved" : "Save to library"}
                    >
                      <Icon name="heart" size={18} />
                    </button>
                    <div className="meal-search-action">
                      <AddToWeekPicker
                        meal={{ id: savedId ?? (library ?? []).find((m) => m.spoonacular_id === recipe.id)?.id, title: recipe.title }}
                        ensureSaved={() => save(recipe)}
                        onAdded={onPlanned}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p className="picker-error">{error}</p>}
        </div>
      )}
    </section>
  );
}

export default MealSearch;
