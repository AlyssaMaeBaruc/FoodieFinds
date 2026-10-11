import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import RecipeImage from './RecipeImage';
import GradeBadge from './GradeBadge';
import { searchLibrary } from '../library';

// pop-up to fill an empty slot on the This Week page: pick from your saved meals, or find a
// new recipe on Spoonacular (it's saved to your library, then planned).
// target = { label: "Tue 6 Oct", slot: "lunch" } while open, null when closed
// onPickNew(recipe): a Spoonacular search result { id, title, image } was picked
function MealChooser({ target, savedMeals, loading, busy, error, onPick, onPickNew, onClose }) {
  const dialogRef = useRef(null);
  const [tab, setTab] = useState("mine");          // "mine" | "new"
  const [search, setSearch] = useState("");
  // "Find new recipe" tab
  const [newQuery, setNewQuery] = useState("");
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [findError, setFindError] = useState(null);

  // native <dialog> gives focus trapping, Esc to close and a backdrop for free
  useEffect(() => {
    const dialog = dialogRef.current;
    if (target && !dialog.open) {
      setTab("mine");
      setSearch("");
      setNewQuery("");
      setFound(null);
      setFindError(null);
      dialog.showModal();
    }
    if (!target && dialog.open) dialog.close();
  }, [target]);

  // by name, tag or ingredient
  const shown = search.trim().length > 0
    ? searchLibrary(savedMeals ?? [], search).map(({ meal }) => meal)
    : savedMeals ?? [];

  // about 1 point per new search (the same search again is free)
  const findNew = async (e) => {
    e.preventDefault();
    const q = newQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    setFindError(null);
    try {
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't search recipes right now.");
      setFound(data.results);
    } catch (err) {
      setFindError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="meal-chooser glass"
      onClose={onClose}
      // clicking the dimmed backdrop (the dialog element itself) closes it
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="meal-chooser-title"
    >
      {target && (
        <div className="chooser-inner">
          <div className="chooser-header">
            <h2 id="meal-chooser-title" className="chooser-title">
              Add {target.slot} for <span>{target.label}</span>
            </h2>
            <button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>

          <div className="slot-toggle chooser-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "mine"} className={`slot-option${tab === "mine" ? " is-active" : ""}`} onClick={() => setTab("mine")}>
              My meals
            </button>
            <button type="button" role="tab" aria-selected={tab === "new"} className={`slot-option${tab === "new" ? " is-active" : ""}`} onClick={() => setTab("new")}>
              Find new recipe
            </button>
          </div>

          {error && <p className="picker-error">{error}</p>}

          {tab === "mine" && (
            <>
              {savedMeals?.length > 0 && (
                <input
                  type="search"
                  className="chooser-search"
                  placeholder="Search by name, tag or ingredient"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              )}
              {loading && <p className="recipe-note">Loading your saved meals…</p>}

              {!loading && savedMeals?.length === 0 && (
                <p className="recipe-note">
                  You have no saved meals yet. Use <button type="button" className="link-button" onClick={() => setTab("new")}>Find new recipe</button> to search for one.
                </p>
              )}
              {!loading && savedMeals?.length > 0 && shown.length === 0 && (
                <p className="recipe-note">
                  No saved meals match &ldquo;{search}&rdquo;.{" "}
                  <button type="button" className="link-button" onClick={() => { setNewQuery(search); setTab("new"); }}>Find a new recipe</button>
                </p>
              )}

              <ul className="chooser-list">
                {shown.map((meal) => (
                  <li key={meal.id}>
                    <button className="chooser-item" disabled={busy} onClick={() => onPick(meal)}>
                      <RecipeImage src={meal.image} />
                      <span>{meal.title}</span>
                      <GradeBadge grade={meal.grade} inline />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "new" && (
            <>
              <form className="chooser-find" onSubmit={findNew}>
                <input
                  type="search"
                  className="chooser-search"
                  placeholder="e.g. chicken curry, pasta, salmon"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-accent btn-sm" disabled={searching || newQuery.trim().length < 2}>
                  <Icon name="search" size={14} /> {searching ? "Searching…" : "Search"}
                </button>
              </form>
              <p className="recipe-note">Each new search uses about 1 API point. Picking a recipe saves it to your library.</p>
              {findError && <p className="picker-error">{findError}</p>}
              {found?.length === 0 && <p className="recipe-note">No recipes found. Try another word.</p>}
              {found?.length > 0 && (
                <ul className="chooser-list">
                  {found.map((recipe) => (
                    <li key={recipe.id}>
                      <button className="chooser-item" disabled={busy} onClick={() => onPickNew(recipe)}>
                        <RecipeImage src={recipe.image} />
                        <span>{recipe.title}</span>
                        <Icon name="plus" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="recipe-note">
                Want more filters? <Link to="/library?view=find" className="hero-link" onClick={onClose}>Search by ingredients and cuisine</Link>
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

export default MealChooser;
