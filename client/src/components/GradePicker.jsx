import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const GRADES = ["A", "B", "C", "D", "E"];

// pop-up to pick a meal's health grade, or go back to Spoonacular's (Auto).
// meal: the saved meal (null = closed); onSaved(mealId, { grade, grade_source, auto_grade, health_score })
function GradePicker({ meal, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (meal && !dialog.open) {
      setError(null);
      dialog.showModal();
    }
    if (!meal && dialog.open) dialog.close();
  }, [meal]);

  // grade: "A".."E", or null for Auto
  const choose = async (grade) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${meal.id}/grade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't save the grade. Please try again.");
      onSaved(meal.id, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const auto = meal?.auto_grade ?? null;
  const isOverride = meal?.grade_source === "override";

  return (
    <dialog
      ref={dialogRef}
      className="grade-picker glass"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="grade-picker-title"
    >
      {meal && (
        <div className="tag-editor-inner">
          <div className="chooser-header">
            <h2 id="grade-picker-title" className="chooser-title">Health <span>grade</span></h2>
            <button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
          <p className="tag-editor-meal">{meal.title}</p>

          <div className="grade-options" role="radiogroup" aria-label="Grade">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                role="radio"
                aria-checked={meal.grade === grade}
                className={`grade-option grade-${grade.toLowerCase()}${meal.grade === grade ? " is-current" : ""}`}
                onClick={() => choose(grade)}
                disabled={busy}
              >
                {grade}
              </button>
            ))}
          </div>

          <p className="grade-note">
            {meal.health_score !== null && meal.health_score !== undefined
              ? <>Spoonacular's health score is <strong>{meal.health_score}</strong>/100, which is {auto === "A" || auto === "E" ? "an" : "a"} <strong>{auto}</strong>.</>
              : "Spoonacular couldn't score this recipe, so pick a grade yourself."}
            {isOverride && " You've set your own grade."}
          </p>

          {error && <p className="picker-error">{error}</p>}

          {isOverride && auto && (
            <div className="picker-buttons">
              <button className="btn btn-ghost" onClick={() => choose(null)} disabled={busy}>
                Use Spoonacular's grade ({auto})
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export default GradePicker;
