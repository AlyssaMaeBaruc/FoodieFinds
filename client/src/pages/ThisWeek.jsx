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

      {error && <div className="error-message glass">{error}</div>}
      {!loading && !error && meals.length === 0 && (
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
                      meta={<><Icon name="utensils" size={14} /> {meal.servings} {meal.servings === 1 ? "portion" : "portions"}</>}
                    >
                      <button className="btn btn-ghost btn-sm" onClick={() => removeMeal(meal.id)}><Icon name="x" size={14} /> Remove</button>
                    </RecipeCard>
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
