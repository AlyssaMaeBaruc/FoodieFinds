import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RecipeCard from "../components/RecipeCard";
import { getWeekDays, todayText, SLOTS } from "../week";

// Monday to Sunday view of the meal plan, with lunch and dinner for each day
function ThisWeek() {
  const weekDays = getWeekDays();
  const today = todayText();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/meal-plan?week=${today}`)
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load your week. Please try again later.");
        return res.json();
      })
      .then((data) => setMeals(data.meals))
      .catch((err) => {
        setError(err.message);
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [today]);

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

  const mealFor = (date, slot) => meals.find((meal) => meal.plan_date === date && meal.slot === slot);

  return (
    <main className="page page-wide">
      <section className="hero glass">
        <h1 className="hero-title">This <span>week</span></h1>
        <p className="hero-text">
          {weekDays[0].label} – {weekDays[6].label}. Plan lunches and dinners from{" "}
          <Link to="/favourites" className="hero-link">your saved meals</Link>.
        </p>
      </section>

      {error && <div className="error-message glass">{error}</div>}
      {!loading && !error && meals.length === 0 && (
        <p className="empty-state">Nothing planned yet. Open My Saved Meals and tap 📅 Add to this week.</p>
      )}

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
                    >
                      <button className="btn btn-ghost" onClick={() => removeMeal(meal.id)}>✖️ Remove</button>
                    </RecipeCard>
                  ) : (
                    <div className="slot-empty">Nothing planned</div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}

export default ThisWeek;
