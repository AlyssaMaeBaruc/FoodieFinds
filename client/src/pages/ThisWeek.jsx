import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RecipeCard from "../components/RecipeCard";
import MealChooser from "../components/MealChooser";
import Icon from "../components/Icon";
import WeekNav, { useSelectedWeek } from "../components/WeekNav";
import { todayText, weekTitle, SLOTS } from "../week";

// Monday to Sunday view of the meal plan, with lunch and dinner for each day.
// ?week=YYYY-MM-DD picks another week, so Back from a recipe returns to the same week
function ThisWeek() {
  const { weekDays, weekStart, offset, goToWeek, goToThisWeek } = useSelectedWeek();
  const today = todayText();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // bumped after adding a meal so the week reloads with the new card
  const [reloadKey, setReloadKey] = useState(0);

  // "+ Add" pop-up: which empty slot it is filling, plus the saved meals to choose from
  const [chooserTarget, setChooserTarget] = useState(null);
  const [savedMeals, setSavedMeals] = useState(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [chooserError, setChooserError] = useState(null);

  // "Fill my week" preview: { suggestions, unfilled, library_size } while previewing, else null
  const [preview, setPreview] = useState(null);
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shufflingKey, setShufflingKey] = useState(null);
  // meals already shown in each slot while shuffling, so shuffles don't bounce back
  const [triedIds, setTriedIds] = useState({});
  const [previewNote, setPreviewNote] = useState(null);

  // a different week means different slots: drop any preview
  useEffect(() => {
    setPreview(null);
    setPreviewNote(null);
  }, [weekStart]);

  useEffect(() => {
    // ignore answers for a week the user has already clicked away from
    let current = true;
    setLoading(true);
    setError(null);
    fetch(`/api/meal-plan?week=${weekStart}`)
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load this week. Please try again later.");
        return res.json();
      })
      .then((data) => current && setMeals(data.meals))
      .catch((err) => {
        if (!current) return;
        setMeals([]);
        setError(err.message);
        console.error(err);
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [weekStart, reloadKey]);

  const removeMeal = (id) => {
    fetch(`/api/meal-plan/${id}`, { method: "DELETE" })
      .then((res) => {
        // 404 means it was already gone, so drop it from the page either way
        if (!res.ok && res.status !== 404) throw new Error("Couldn't remove that meal. Please try again.");
        setMeals((current) => current.filter((meal) => meal.id !== id));
      })
      .catch((err) => {
        setError(err.message);
        console.error(err);
      });
  };

  const openChooser = (day, slot) => {
    setChooserTarget({ date: day.date, label: day.label, slot });
    setChooserError(null);
    // saved meals are loaded once, the first time the pop-up opens
    if (savedMeals === null) {
      setSavedLoading(true);
      fetch("/api/recipes")
        .then((res) => {
          if (!res.ok) throw new Error("Couldn't load your saved meals.");
          return res.json();
        })
        .then((data) => setSavedMeals(data))
        .catch((err) => {
          setChooserError(err.message);
          console.error(err);
        })
        .finally(() => setSavedLoading(false));
    }
  };

  const addToSlot = async (savedMeal) => {
    setAdding(true);
    setChooserError(null);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_meal_id: savedMeal.id, plan_date: chooserTarget.date, slot: chooserTarget.slot }),
      });
      const data = await res.json().catch(() => ({}));
      // the slot was filled elsewhere (e.g. another tab) since this page loaded
      if (res.status === 409) {
        setReloadKey((k) => k + 1);
        throw new Error(`This slot was just filled with ${data.existing?.title ?? "another meal"}. Remove it first to choose a different one.`);
      }
      if (!res.ok) throw new Error(data.message || "Couldn't add that meal. Please try again.");
      setChooserTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setChooserError(err.message);
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const mealFor = (date, slot) => meals.find((meal) => meal.plan_date === date && meal.slot === slot);
  const suggestionFor = (date, slot) => preview?.suggestions.find((s) => s.plan_date === date && s.slot === slot);
  const slotKey = (s) => `${s.plan_date}|${s.slot}`;

  // empty slots to fill; in the current week, days that have already passed are skipped
  const emptySlots = weekDays
    .filter((day) => offset !== 0 || day.date >= today)
    .flatMap((day) => SLOTS.map((slot) => ({ plan_date: day.date, slot })))
    .filter((s) => !mealFor(s.plan_date, s.slot));

  const requestSuggestions = async (body) => {
    const res = await fetch("/api/meal-plan/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekStart, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't suggest meals right now. Please try again.");
    return data;
  };

  const fillWeek = async () => {
    setFilling(true);
    setError(null);
    setPreviewNote(null);
    try {
      const data = await requestSuggestions({ slots: emptySlots, suggestions: [] });
      if (data.suggestions.length === 0) {
        throw new Error(data.library_size === 0
          ? "Save some meals first, then Fill my week can plan with them."
          : "No meals could be suggested for this week.");
      }
      setTriedIds(Object.fromEntries(data.suggestions.map((s) => [slotKey(s), [s.saved_meal_id]])));
      setPreview(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setFilling(false);
    }
  };

  // swap just one suggestion; everything else in the week stays as it is
  const shuffleSlot = async (suggestion) => {
    const key = slotKey(suggestion);
    const others = preview.suggestions.filter((s) => slotKey(s) !== key);
    const tried = triedIds[key] ?? [suggestion.saved_meal_id];
    setShufflingKey(key);
    setPreviewNote(null);
    try {
      const ask = (avoid) => requestSuggestions({
        slots: [{ plan_date: suggestion.plan_date, slot: suggestion.slot }],
        suggestions: others.map(({ plan_date, slot, saved_meal_id }) => ({ plan_date, slot, saved_meal_id })),
        avoid_ids: avoid,
      });
      let data = await ask(tried);
      let nextTried = tried;
      // every option has been shown here: start the cycle again, avoiding only the current one
      if (data.suggestions.length === 0 && tried.length > 1) {
        data = await ask([suggestion.saved_meal_id]);
        nextTried = [suggestion.saved_meal_id];
      }
      const replacement = data.suggestions[0];
      if (!replacement) {
        setPreviewNote("No other meal fits that slot. Save more recipes for more variety.");
        return;
      }
      setTriedIds((current) => ({ ...current, [key]: [...nextTried, replacement.saved_meal_id] }));
      setPreview((current) => ({
        ...current,
        suggestions: current.suggestions.map((s) => (slotKey(s) === key ? replacement : s)),
      }));
    } catch (err) {
      setPreviewNote(err.message);
      console.error(err);
    } finally {
      setShufflingKey(null);
    }
  };

  // "Keep these": all suggestions in one request
  const keepSuggestions = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-plan/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals: preview.suggestions.map(({ plan_date, slot, saved_meal_id }) => ({ plan_date, slot, saved_meal_id })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't save the suggestions. Please try again.");
      setPreview(null);
    } catch (err) {
      setError(err.message);
      setPreview(null);
      console.error(err);
    } finally {
      setSaving(false);
      setReloadKey((k) => k + 1);
    }
  };

  const unfilledCount = preview?.unfilled.length ?? 0;
  const repeatCount = preview?.suggestions.filter((s) => s.repeat).length ?? 0;
  const lastWeekCount = preview?.suggestions.filter((s) => s.from_last_week).length ?? 0;
  const [firstWord, ...rest] = weekTitle(offset, weekDays).split(" ");

  return (
    <main className="page page-wide">
      <section className="hero">
        <p className="eyebrow">Meal plan</p>
        <h1 className="hero-title">{firstWord} <span>{rest.join(" ")}</span></h1>
        <p className="hero-text">
          {weekDays[0].label} – {weekDays[6].label}. Plan lunches and dinners from{" "}
          <Link to="/favourites" className="hero-link">your saved meals</Link>.
        </p>
      </section>

      <WeekNav offset={offset} goToWeek={goToWeek} goToThisWeek={goToThisWeek} />

      {!preview && !loading && (
        <div className="fill-row">
          <button className="btn btn-accent" onClick={fillWeek} disabled={filling || emptySlots.length === 0}>
            <Icon name="sparkles" size={16} /> {filling ? "Finding meals…" : "Fill my week"}
          </button>
          <span className="fill-hint">
            {emptySlots.length === 0
              ? "Every slot is planned"
              : `Suggests meals for ${emptySlots.length} empty ${emptySlots.length === 1 ? "slot" : "slots"} from your saved meals`}
          </span>
        </div>
      )}

      {preview && (
        <div className="preview-bar glass" role="status">
          <div className="preview-text">
            <p className="preview-title">
              <Icon name="sparkles" size={16} /> {preview.suggestions.length} {preview.suggestions.length === 1 ? "suggestion" : "suggestions"}
            </p>
            <p className="preview-notes">
              Picked to reuse ingredients you're already buying.
              {repeatCount > 0 && ` ${repeatCount} ${repeatCount === 1 ? "is a repeat" : "are repeats"} (cook once, eat twice).`}
              {lastWeekCount > 0 && ` ${lastWeekCount} reused from last week.`}
              {unfilledCount > 0 && ` ${unfilledCount} ${unfilledCount === 1 ? "slot is" : "slots are"} still empty: save more recipes to fill them.`}
            </p>
            {previewNote && <p className="preview-warning"><Icon name="alert" size={14} /> {previewNote}</p>}
          </div>
          <div className="preview-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)} disabled={saving}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={keepSuggestions} disabled={saving}>
              <Icon name="check" size={14} /> {saving ? "Saving…" : "Keep these"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message glass">{error}</div>}
      {!loading && !error && !preview && meals.length === 0 && (
        <p className="empty-state">Nothing planned for this week yet. Tap Add on any day to pick from your saved meals.</p>
      )}

      {/* scrolls sideways when the screen is too narrow for 7 columns */}
      <div className="week-scroll">
      <div className="week-grid">
        {weekDays.map((day) => (
          <section key={day.date} className={`day-column glass${day.date === today ? " is-today" : ""}`}>
            <h2 className="day-heading">
              {day.label}
              {day.date === today && <span className="today-badge">Today</span>}
            </h2>

            {SLOTS.map((slot) => {
              const meal = mealFor(day.date, slot);
              const suggestion = !meal && suggestionFor(day.date, slot);
              return (
                <div key={slot} className="slot">
                  <h3 className="slot-label">{slot === "lunch" ? "Lunch" : "Dinner"}</h3>
                  {meal ? (
                    <RecipeCard
                      as="div"
                      compact
                      title={meal.title}
                      image={meal.image}
                      spoonacularId={meal.spoonacular_id}
                      link={meal.spoonacular_id ? undefined : `/my-recipe/${meal.saved_meal_id}`}
                      meta={<><Icon name="utensils" size={14} /> {meal.servings} {meal.servings === 1 ? "portion" : "portions"}</>}
                    >
                      {!preview && (
                        <button className="btn btn-ghost btn-sm" onClick={() => removeMeal(meal.id)}><Icon name="x" size={14} /> Remove</button>
                      )}
                    </RecipeCard>
                  ) : suggestion ? (
                    <RecipeCard
                      as="div"
                      compact
                      className={`is-suggested${shufflingKey === slotKey(suggestion) ? " is-shuffling" : ""}`}
                      title={suggestion.title}
                      image={suggestion.image}
                      spoonacularId={suggestion.spoonacular_id}
                      link={suggestion.spoonacular_id ? undefined : `/my-recipe/${suggestion.saved_meal_id}`}
                      mediaAction={
                        <>
                          <span className="suggested-badge">{suggestion.repeat ? "Repeat" : "Suggested"}</span>
                          <button
                            className="photo-button shuffle-button"
                            onClick={() => shuffleSlot(suggestion)}
                            disabled={shufflingKey !== null}
                            aria-label={`Suggest a different meal for ${day.label} ${slot}`}
                            title="Try another"
                          >
                            <Icon name="shuffle" size={16} />
                          </button>
                        </>
                      }
                      meta={
                        <span title={suggestion.shared.length ? `Shares: ${suggestion.shared.join(", ")}` : undefined}>
                          {suggestion.shared.length} shared · {suggestion.added.length} new
                        </span>
                      }
                    >
                      <p className="suggest-detail">
                        {suggestion.added.length ? `New: ${suggestion.added.slice(0, 3).join(", ")}${suggestion.added.length > 3 ? "…" : ""}` : "Nothing new to buy"}
                        {suggestion.minutes ? ` · ${suggestion.minutes} min` : ""}
                      </p>
                    </RecipeCard>
                  ) : preview ? (
                    <div className="slot-empty">{offset === 0 && day.date < today ? "Past" : "No suggestion"}</div>
                  ) : (
                    <button
                      className="slot-empty slot-add"
                      onClick={() => openChooser(day, slot)}
                      aria-label={`Add ${slot} for ${day.label}`}
                    >
                      <span className="slot-add-icon"><Icon name="plus" size={18} /></span>
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      </div>

      <MealChooser
        target={chooserTarget}
        savedMeals={savedMeals}
        loading={savedLoading}
        busy={adding}
        error={chooserError}
        onPick={addToSlot}
        onClose={() => setChooserTarget(null)}
      />
    </main>
  );
}

export default ThisWeek;
