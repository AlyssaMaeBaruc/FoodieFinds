import React, { useEffect, useState } from 'react';
import RecipeCard from './RecipeCard';
import GradeBadge from './GradeBadge';
import Icon from './Icon';

// "uses spinach (use soon), feta": what a recipe takes from the pantry
function UsesLine({ uses }) {
  return (
    <span className="uses-line">
      {uses.map((use, index) => (
        <span key={use.name} className={use.use_soon ? "uses-soon" : undefined}>
          {index > 0 && ", "}
          {use.use_soon && <Icon name="clock" size={11} />}
          {use.name}
        </span>
      ))}
    </span>
  );
}

function LibraryCard({ meal }) {
  return (
    <RecipeCard
      title={meal.title}
      image={meal.image}
      spoonacularId={meal.spoonacular_id}
      link={meal.is_custom ? `/my-recipe/${meal.id}` : undefined}
      badge={meal.grade && <GradeBadge grade={meal.grade} />}
      meta={<>Uses <UsesLine uses={meal.uses} /></>}
    >
      {meal.missing.length > 0 && (
        <p className="missing-line"><Icon name="plus" size={12} /> Missing: {meal.missing.join(", ")}</p>
      )}
    </RecipeCard>
  );
}

// "What can I make?" on the Pantry page.
// pantryKey changes whenever the pantry does, so the suggestions reload (free)
function WhatCanIMake({ pantryKey, pantrySize }) {
  const [library, setLibrary] = useState(null);
  const [ideas, setIdeas] = useState(null);       // null = not looked for yet with this pantry
  const [ideasSaved, setIdeasSaved] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pantrySize === 0) return;
    let current = true;
    setError(null);
    // library matches, and any ideas already found for exactly this pantry (both free)
    Promise.all([
      fetch("/api/pantry/suggestions").then((res) => (res.ok ? res.json() : Promise.reject(new Error("Couldn't check your saved meals.")))),
      fetch("/api/pantry/ideas").then((res) => (res.ok ? res.json() : { ideas: null })),
    ])
      .then(([matches, found]) => {
        if (!current) return;
        setLibrary(matches);
        setIdeas(found.ideas);
        setIdeasSaved(found.saved);
      })
      .catch((err) => current && setError(err.message));
    return () => { current = false; };
  }, [pantryKey, pantrySize]);

  // asks Spoonacular (about 1 point), only when this pantry hasn't been asked before
  const findIdeas = async () => {
    setLoadingIdeas(true);
    setError(null);
    try {
      const res = await fetch("/api/pantry/ideas?fetch=1");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't find ideas right now. Please try again.");
      setIdeas(data.ideas);
      setIdeasSaved(data.saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const saveIdea = async (idea) => {
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: idea.title, image: idea.image, spoonacular_id: idea.spoonacular_id }),
      });
      // 409: it was already saved
      if (!res.ok && res.status !== 409) throw new Error("Couldn't save that recipe. Please try again.");
      setSavedIds((current) => new Set(current).add(idea.spoonacular_id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (pantrySize === 0) {
    return (
      <section className="make-section">
        <h2 className="make-title">What can I <span>make?</span></h2>
        <p className="empty-state">Add what you have to see what you can make.</p>
      </section>
    );
  }

  const ready = library?.ready ?? [];
  const almost = library?.almost ?? [];

  return (
    <section className="make-section">
      <h2 className="make-title">What can I <span>make?</span></h2>
      <p className="make-intro">From what's in your pantry. Things marked <Icon name="clock" size={12} /> use soon count extra. Basics like salt and oil are ignored.</p>
      {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}
      {library === null && !error && <p className="empty-state">Checking your saved meals…</p>}

      {library && (
        <>
          <h3 className="make-group">
            <Icon name="check" size={16} /> Ready to cook <span className="count">{ready.length}</span>
          </h3>
          {ready.length > 0 ? (
            <ul className="recipe-grid make-grid">{ready.map((meal) => <LibraryCard key={meal.id} meal={meal} />)}</ul>
          ) : (
            <p className="make-empty">
              None of your saved meals can be made with just your pantry yet{almost.length > 0 ? ", but these are close:" : "."}
            </p>
          )}

          {almost.length > 0 && (
            <>
              <h3 className="make-group">
                <Icon name="plus" size={16} /> Missing 1–2 ingredients <span className="count">{almost.length}</span>
              </h3>
              <ul className="recipe-grid make-grid">{almost.map((meal) => <LibraryCard key={meal.id} meal={meal} />)}</ul>
            </>
          )}
        </>
      )}

      <div className="ideas-head">
        <h3 className="make-group"><Icon name="sparkles" size={16} /> New ideas</h3>
        {ideas === null && (
          <button className="btn btn-accent btn-sm" onClick={findIdeas} disabled={loadingIdeas}>
            <Icon name="search" size={14} /> {loadingIdeas ? "Finding ideas…" : "Find new ideas"}
          </button>
        )}
      </div>
      {ideas === null ? (
        <p className="make-empty">Recipes from Spoonacular that use what you have. Uses about 1 API point, then saved until your pantry changes.</p>
      ) : ideas.length === 0 ? (
        <p className="make-empty">No new ideas for this pantry. Add a few more ingredients and try again.</p>
      ) : (
        <>
          {ideasSaved && <p className="make-empty">Saved ideas for this pantry (free). They refresh when your pantry changes.</p>}
          <ul className="recipe-grid make-grid">
            {ideas.map((idea) => (
              <RecipeCard
                key={idea.spoonacular_id}
                title={idea.title}
                image={idea.image}
                spoonacularId={idea.spoonacular_id}
                onSave={() => saveIdea(idea)}
                isSaved={savedIds.has(idea.spoonacular_id)}
                meta={<>Uses <UsesLine uses={idea.uses} /></>}
              >
                {idea.missing.length > 0 && (
                  <p className="missing-line">
                    <Icon name="plus" size={12} /> Missing: {idea.missing.slice(0, 4).join(", ")}{idea.missing.length > 4 ? ` +${idea.missing.length - 4} more` : ""}
                  </p>
                )}
              </RecipeCard>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default WhatCanIMake;
