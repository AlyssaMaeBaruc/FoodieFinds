import React, { useState } from 'react';
import { getWeekDays, todayText, SLOTS } from '../week';

// "Add to this week" button that opens a day + lunch/dinner picker inside a saved meal card
function AddToWeekPicker({ meal }) {
  const weekDays = getWeekDays();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayText());
  const [slot, setSlot] = useState("dinner");
  const [saving, setSaving] = useState(false);
  // the meal already in the chosen slot, while we ask whether to replace it
  const [conflict, setConflict] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const slotLabel = () => `${weekDays.find((d) => d.date === date)?.weekday} ${slot}`;

  const reset = () => {
    setConflict(null);
    setError(null);
  };

  const addToPlan = async (replace = false) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_meal_id: meal.id, plan_date: date, slot, replace }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409 && data.existing) {
        setConflict(data.existing);
        return;
      }
      if (!response.ok) throw new Error(data.message || "Couldn't add to your week. Please try again.");

      const alreadyThere = data.message === "Meal is already planned for this slot";
      setMessage(alreadyThere ? `Already planned for ${slotLabel()} ✓` : `Added to ${slotLabel()} ✓`);
      setConflict(null);
      setOpen(false);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <>
        {message && <p className="plan-message">{message}</p>}
        <button className="btn btn-ghost" onClick={() => { setOpen(true); setMessage(null); }}>
          📅 Add to this week
        </button>
      </>
    );
  }

  return (
    <div className="week-picker">
      <label className="picker-label">
        Day
        <select className="picker-select" value={date} onChange={(e) => { setDate(e.target.value); reset(); }}>
          {weekDays.map((day) => (
            <option key={day.date} value={day.date}>{day.label}</option>
          ))}
        </select>
      </label>

      <div className="slot-toggle" role="radiogroup" aria-label="Meal">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={slot === s}
            className={`slot-option${slot === s ? " is-active" : ""}`}
            onClick={() => { setSlot(s); reset(); }}
          >
            {s === "lunch" ? "Lunch" : "Dinner"}
          </button>
        ))}
      </div>

      {conflict ? (
        <div className="picker-confirm" role="alert">
          <p><strong>{slotLabel()}</strong> already has <strong>{conflict.title}</strong>. Replace it?</p>
          <div className="picker-buttons">
            <button className="btn btn-accent" disabled={saving} onClick={() => addToPlan(true)}>
              {saving ? "Replacing…" : "Replace"}
            </button>
            <button className="btn btn-ghost" disabled={saving} onClick={() => setConflict(null)}>Keep current</button>
          </div>
        </div>
      ) : (
        <div className="picker-buttons">
          <button className="btn btn-accent" disabled={saving} onClick={() => addToPlan()}>
            {saving ? "Adding…" : "Add"}
          </button>
          <button className="btn btn-ghost" disabled={saving} onClick={() => { setOpen(false); reset(); }}>Cancel</button>
        </div>
      )}

      {error && <p className="picker-error">{error}</p>}
    </div>
  );
}

export default AddToWeekPicker;
