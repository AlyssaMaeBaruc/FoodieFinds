import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RecipesList from './RecipesList';
import AddToWeekPicker from './AddToWeekPicker';
import AddRecipeDialog from './AddRecipeDialog';
import TagEditor from './TagEditor';
import GradeBadge from './GradeBadge';
import GradePicker from './GradePicker';
import Icon from './Icon';


// Library > "My meals": saved and custom recipes, with tags, grades and select mode
function MyMeals({ onFindRecipes }) {

    const [mealList, setMealList] = useState([]);
    // "Add recipe" pop-up
    const [adding, setAdding] = useState(false);

    // select mode: pick several meals (or all) and delete them together
    const [selecting, setSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    // every tag, and the meal whose tags are being edited
    const [tags, setTags] = useState([]);
    const [editingMeal, setEditingMeal] = useState(null);
    // the meal whose health grade is being changed
    const [gradingMeal, setGradingMeal] = useState(null);


  const listOfSavedMeals = () => {
fetch("/api/recipes")
  .then((res) => res.json())
  .then((data) => {
    // upon success, update tasks
    console.log(data);
    setMealList(data);
  })
  .catch((error) => {
    // upon failure, show error message
    console.error("Error", error);
  });
}

      //so for this page, it should be updated once it loads, once a user favourites a new meal. then it should appear 
      useEffect (() => {
        listOfSavedMeals();
        fetch("/api/tags")
          .then((res) => (res.ok ? res.json() : []))
          .then(setTags)
          .catch((error) => console.error("Error loading tags", error));
      }, []);

      // a tag was created or deleted: deleted ones come off every meal too
      const tagsChanged = (nextTags) => {
        setTags(nextTags);
        const ids = new Set(nextTags.map((tag) => tag.id));
        setMealList((current) => current.map((meal) => ({ ...meal, tags: (meal.tags ?? []).filter((tag) => ids.has(tag.id)) })));
      };

      const tagsSaved = (mealId, mealTags) => {
        setMealList((current) => current.map((meal) => (meal.id === mealId ? { ...meal, tags: mealTags } : meal)));
        setEditingMeal(null);
      };

      const gradeSaved = (mealId, grade) => {
        setMealList((current) => current.map((meal) => (meal.id === mealId ? { ...meal, ...grade } : meal)));
        setGradingMeal(null);
      };

      // tag chips under the title, ending with the button that opens the editor
      const renderTags = (meal) => (
        <span className="card-tags">
          {(meal.tags ?? []).map((tag) => <span key={tag.id} className="tag-chip">{tag.name}</span>)}
          {!selecting && (
            <button className="tag-edit-button" onClick={() => setEditingMeal(meal)} aria-label={`Edit tags for ${meal.title}`}>
              <Icon name="tag" size={12} /> {meal.tags?.length ? "Edit" : "Add tags"}
            </button>
          )}
        </span>
      );


      const stopSelecting = () => {
        setSelecting(false);
        setSelectedIds(new Set());
        setConfirming(false);
      };

      const toggleSelected = (id) => {
        setConfirming(false);
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      };

      const allSelected = mealList.length > 0 && selectedIds.size === mealList.length;
      const toggleSelectAll = () => {
        setConfirming(false);
        setSelectedIds(allSelected ? new Set() : new Set(mealList.map((meal) => meal.id)));
      };

      // one request for all selected meals
      const deleteSelected = async () => {
        const ids = [...selectedIds];
        setDeleting(true);
        setError(null);
        try {
          const res = await fetch("/api/recipes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          if (!res.ok) throw new Error("Couldn't delete those meals. Please try again.");
          setMealList((current) => current.filter((meal) => !selectedIds.has(meal.id)));
          stopSelecting();
        } catch (err) {
          setError(err.message);
          console.error("Error deleting meals:", err);
        } finally {
          setDeleting(false);
        }
      };

      return (
        <>
        <section className="hero">
          <p className="eyebrow">Your collection</p>
          <h1 className="hero-title">My <span>meals</span></h1>
          <p className="hero-text">Everything you've saved or added yourself, ready to plan into your week. Happy cooking!</p>
          <button className="btn btn-accent hero-action" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add recipe
          </button>
        </section>
        {mealList.length > 0 && (
          <div className={`select-bar glass${selecting ? " is-active" : ""}`}>
            {!selecting ? (
              <>
                <span className="select-count">
                  <strong>{mealList.length}</strong> saved {mealList.length === 1 ? "meal" : "meals"}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelecting(true)}>
                  <Icon name="check" size={14} /> Select
                </button>
              </>
            ) : confirming ? (
              <>
                <span className="select-count">
                  Delete <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "meal" : "meals"}? They'll also be removed from your meal plan.
                </span>
                <div className="select-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={deleting}>Keep</button>
                  <button className="btn btn-danger btn-sm" onClick={deleteSelected} disabled={deleting}>
                    <Icon name="trash" size={14} /> {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="select-count">
                  <strong>{selectedIds.size}</strong> selected
                </span>
                <div className="select-actions">
                  <button className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)} disabled={selectedIds.size === 0}>
                    <Icon name="trash" size={14} /> Delete
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={stopSelecting}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
        {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}
        {mealList.length === 0 && (
          <p className="empty-state">
            No saved meals yet. <button type="button" className="link-button" onClick={onFindRecipes}>Find new recipes</button> and tap the heart, or add your own with Add recipe.
          </p>
        )}
        {/* i transferred all of this to the components recipeslist as im using the same logic */}
          {/* <div >
            {mealList.map((meal, index) => (
              <div className="container" key={index}>
                <h3>{meal.title}</h3>
                  <li >
                    <img src={meal.image} alt={meal.title} />
                  </li>
              </div>
            ))}
          </div> */}
            <RecipesList
              recipes={mealList}
              showSaveButton={false}
              renderActions={(meal) => <AddToWeekPicker meal={meal} />}
              renderMeta={renderTags}
              renderBadge={(meal) => (
                <GradeBadge grade={meal.grade} source={meal.grade_source} title={meal.title} onClick={() => setGradingMeal(meal)} />
              )}
              selection={selecting ? { selectedIds, onToggle: toggleSelected } : undefined}
            />
            <GradePicker meal={gradingMeal} onClose={() => setGradingMeal(null)} onSaved={gradeSaved} />
            <TagEditor
              meal={editingMeal}
              tags={tags}
              onClose={() => setEditingMeal(null)}
              onTagsChanged={tagsChanged}
              onSaved={tagsSaved}
            />
            <AddRecipeDialog
              open={adding}
              onClose={() => setAdding(false)}
              onSaved={() => { setAdding(false); listOfSavedMeals(); }}
            />
        </>
      );
    }
      
export default MyMeals
