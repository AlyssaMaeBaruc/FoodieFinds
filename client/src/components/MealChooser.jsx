import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// pop-up listing saved meals, used to fill an empty slot on the This Week page.
// target = { label: "Tue 6 Oct", slot: "lunch" } while open, null when closed
function MealChooser({ target, savedMeals, loading, busy, error, onPick, onClose }) {
  const dialogRef = useRef(null);
  const [search, setSearch] = useState("");

  // native <dialog> gives focus trapping, Esc to close and a backdrop for free
  useEffect(() => {
    const dialog = dialogRef.current;
    if (target && !dialog.open) {
      setSearch("");
      dialog.showModal();
    }
    if (!target && dialog.open) dialog.close();
  }, [target]);

  const shown = (savedMeals ?? []).filter((meal) =>
    meal.title.toLowerCase().includes(search.trim().toLowerCase())
  );

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

          {savedMeals?.length > 0 && (
            <input
              type="search"
              className="chooser-search"
              placeholder="Search your saved meals"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          )}

          {error && <p className="picker-error">{error}</p>}
          {loading && <p className="recipe-note">Loading your saved meals…</p>}

          {!loading && savedMeals?.length === 0 && (
            <p className="recipe-note">
              You have no saved meals yet. <Link to="/" className="hero-link" onClick={onClose}>Find recipes</Link> and tap the heart to save some.
            </p>
          )}
          {!loading && savedMeals?.length > 0 && shown.length === 0 && (
            <p className="recipe-note">No saved meals match &ldquo;{search}&rdquo;.</p>
          )}

          <ul className="chooser-list">
            {shown.map((meal) => (
              <li key={meal.id}>
                <button className="chooser-item" disabled={busy} onClick={() => onPick(meal)}>
                  <img src={meal.image} alt="" />
                  <span>{meal.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </dialog>
  );
}

export default MealChooser;
