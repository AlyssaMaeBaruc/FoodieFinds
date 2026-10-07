import React from 'react';

// small coloured health grade (A dark green ... E red).
// With onClick it's a button (to change the grade); a meal without a grade then shows "Set grade".
// inline: sits in text (meal chooser) instead of on the photo
function GradeBadge({ grade, source, onClick, inline = false, title: mealTitle }) {
  const label = grade
    ? `Health grade ${grade}${source === "override" ? " (set by you)" : ""}`
    : "No health grade yet";
  const className = `grade-badge${grade ? ` grade-${grade.toLowerCase()}` : " is-empty"}${inline ? " is-inline" : ""}`;
  const text = grade ?? "Set grade";

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={`${label}${mealTitle ? ` for ${mealTitle}` : ""}. Change grade`}
        title={`${label}. Tap to change`}
      >
        {text}
      </button>
    );
  }
  if (!grade) return null;
  return <span className={className} title={label} aria-label={label}>{grade}</span>;
}

export default GradeBadge;
