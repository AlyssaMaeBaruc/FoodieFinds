import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import RecipeImage from "../components/RecipeImage";
import WeekNav, { useSelectedWeek } from "../components/WeekNav";
import { parseDateText, weekTitle } from "../week";

// "2026-10-07" + "lunch" -> "Wed Lunch"
function slotLabel(meal) {
  const date = parseDateText(meal.plan_date);
  const weekday = date ? date.toLocaleDateString("en-GB", { weekday: "short" }) : "";
  return `${weekday} ${meal.slot.charAt(0).toUpperCase()}${meal.slot.slice(1)}`;
}

// the same recipe planned on several days becomes one entry with its total portions
// and the days it's for; meals arrive in plan order, so days stay in order too
function groupByRecipe(meals) {
  const recipes = new Map();
  for (const meal of meals) {
    const key = meal.saved_meal_id ?? meal.title;
    const recipe = recipes.get(key);
    if (recipe) {
      recipe.portions += meal.servings;
      recipe.days.push(slotLabel(meal));
    } else {
      recipes.set(key, { ...meal, portions: meal.servings, days: [slotLabel(meal)] });
    }
  }
  return [...recipes.values()];
}

// how long a ticked item stays in its aisle (so the tick registers) before sliding out
const SETTLE_MS = 450;
const LEAVE_MS = 250;

// fixed alphabetical order, so nothing reshuffles while you tick
const byName = (items) => [...items].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));

function groupByAisle(items) {
  const aisles = new Map();
  for (const item of items) {
    if (!aisles.has(item.aisle)) aisles.set(item.aisle, []);
    aisles.get(item.aisle).push(item);
  }
  return [...aisles.entries()]
    .map(([aisle, aisleItems]) => ({ aisle, items: byName(aisleItems) }))
    .sort((a, b) => a.aisle.localeCompare(b.aisle));
}

// one checkbox row: ingredient name, and the planned meals that use it underneath
function ShoppingItem({ item, onToggle, leaving = false }) {
  return (
    <li className={`shopping-item${item.bought ? " is-bought" : ""}${leaving ? " is-leaving" : ""}`}>
      <label>
        <input type="checkbox" className="check" checked={item.bought} onChange={() => onToggle(item)} />
        <span className="item-text">
          <span className="item-name">{item.ingredient_name}</span>
          {item.used_in.length > 0 && <span className="item-used">{item.used_in.join(", ")}</span>}
        </span>
      </label>
    </li>
  );
}

function ShoppingList() {
  const { weekDays, weekStart, offset, goToWeek, goToThisWeek } = useSelectedWeek();

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  // items just ticked that are still shown in their aisle: id -> "shown" | "leaving"
  const [settling, setSettling] = useState({});
  const timers = useRef({});

  const clearSettling = (id) => {
    (timers.current[id] ?? []).forEach(clearTimeout);
    delete timers.current[id];
    setSettling(({ [id]: _removed, ...rest }) => rest);
  };

  // tick shows in place, then the row slides out, then it moves to the basket
  const startSettling = (id) => {
    setSettling((current) => ({ ...current, [id]: "shown" }));
    timers.current[id] = [
      setTimeout(() => setSettling((current) => (current[id] ? { ...current, [id]: "leaving" } : current)), SETTLE_MS),
      setTimeout(() => clearSettling(id), SETTLE_MS + LEAVE_MS),
    ];
  };

  // stop pending timers when leaving the page
  useEffect(() => () => Object.values(timers.current).flat().forEach(clearTimeout), []);

  useEffect(() => {
    // ignore answers for a week the user has already clicked away from
    let current = true;
    setLoading(true);
    setError(null);
    setList(null);
    fetch(`/api/shopping-list?week=${weekStart}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load the shopping list. Please try again later.");
        return data;
      })
      .then((data) => current && setList(data))
      .catch((err) => {
        if (!current) return;
        setError(err.message);
        console.error(err);
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [weekStart]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/shopping-list/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekStart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't make the list. Please try again.");
      setList(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const setItemsBought = (ids, bought) =>
    setList((current) => ({
      ...current,
      items: current.items.map((item) => (ids.includes(item.id) ? { ...item, bought } : item)),
    }));

  // ticks/unticks one or many items straight away (one request), and undoes it if saving fails.
  // animate: ticked items pause in their aisle, then slide into the basket
  const setBought = async (targetItems, bought, { animate = false } = {}) => {
    const ids = targetItems.filter((item) => item.bought !== bought).map((item) => item.id);
    if (ids.length === 0) return;
    setItemsBought(ids, bought);
    ids.forEach((id) => (bought && animate ? startSettling(id) : clearSettling(id)));
    try {
      const res = await fetch("/api/shopping-list/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, bought }),
      });
      if (!res.ok) throw new Error("Couldn't save that change. Please try again.");
    } catch (err) {
      setItemsBought(ids, !bought);
      ids.forEach(clearSettling);
      setError(err.message);
      console.error(err);
    }
  };

  const toggleBought = (item, options) => setBought([item], !item.bought, options);

  const allItems = list?.items ?? [];
  // pantry basics go in their own collapsed section; progress counts the main list only
  const items = allItems.filter((item) => !item.is_pantry);
  const pantryItems = byName(allItems.filter((item) => item.is_pantry));
  // ticked items leave their aisle (after a short pause) and gather in the basket
  const toBuy = items.filter((item) => !item.bought || settling[item.id]);
  const basket = byName(items.filter((item) => item.bought && !settling[item.id]));
  const boughtCount = items.filter((item) => item.bought).length;
  const pantryChecked = pantryItems.filter((item) => item.bought).length;
  const hasList = Boolean(list?.generated_at);
  const recipes = groupByRecipe(list?.meals ?? []);
  const nothingPlanned = list && list.planned_meal_count === 0;
  const generatedAt = hasList
    ? new Date(list.generated_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Groceries</p>
        <h1 className="hero-title">Shopping <span>list</span></h1>
        <p className="hero-text">{weekTitle(offset, weekDays)} · {weekDays[0].label} – {weekDays[6].label}</p>
      </section>

      <WeekNav offset={offset} goToWeek={goToWeek} goToThisWeek={goToThisWeek} />

      {list && (
        <section className="list-toolbar glass">
          <div className="list-status">
            {hasList ? (
              <>
                <p className="list-progress-text">
                  <strong>{boughtCount}</strong> of {items.length} bought
                </p>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={boughtCount}>
                  <div className="progress-fill" style={{ width: `${items.length ? (boughtCount / items.length) * 100 : 0}%` }} />
                </div>
                <p className="list-generated">Generated {generatedAt}</p>
              </>
            ) : (
              <p className="list-progress-text">
                {nothingPlanned ? "No meals planned for this week." : "No list for this week yet."}
              </p>
            )}
          </div>
          {nothingPlanned ? (
            <Link to={offset === 0 ? "/this-week" : `/this-week?week=${weekStart}`} className="btn btn-ghost">
              <Icon name="calendar" size={16} /> Plan meals
            </Link>
          ) : (
            <button className="btn btn-accent" onClick={generate} disabled={generating}>
              <Icon name="check" size={16} />
              {generating ? "Making your list…" : hasList ? "Regenerate list" : "Generate list"}
            </button>
          )}
        </section>
      )}

      {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}
      {loading && <p className="empty-state">Loading your list…</p>}

      {hasList && list.plan_changed && !nothingPlanned && (
        <div className="notice glass" role="status">
          <Icon name="alert" size={18} />
          <span>Your meal plan changed since this list was made. Regenerate to update it. Items you ticked will stay ticked.</span>
        </div>
      )}

      {hasList && recipes.length > 0 && (
        <section className="made-from">
          <h2 className="made-from-title">
            Made from {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
            {recipes.length !== list.meals.length && ` · ${list.meals.length} meals`}
          </h2>
          <ul className="recipe-rows">
            {recipes.map((recipe) => (
              <li key={recipe.saved_meal_id ?? recipe.title} className={`recipe-row glass${recipe.skipped ? " is-skipped" : ""}`}>
                <RecipeImage src={recipe.image} />
                <span className="recipe-row-text">
                  <span className="recipe-row-title">{recipe.title}</span>
                  <span className="recipe-row-meta">
                    <span className="portions">
                      <Icon name="utensils" size={13} /> {recipe.portions} {recipe.portions === 1 ? "portion" : "portions"}
                    </span>
                    <span className="recipe-row-days">{recipe.days.join(", ")}</span>
                  </span>
                  {recipe.skipped && <span className="recipe-row-note">No recipe details, so not included in the list</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasList && allItems.length === 0 && (
        <p className="empty-state">These meals didn't return any ingredients.</p>
      )}

      {toBuy.length > 0 && (
        <div className="aisle-list">
          {groupByAisle(toBuy).map((group) => (
            <section key={group.aisle} className="aisle-card glass">
              <div className="aisle-header">
                <h2 className="aisle-title">
                  {group.aisle}
                  <span className="count">{group.items.filter((item) => !item.bought).length}</span>
                </h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setBought(group.items, true, { animate: true })}
                  aria-label={`Tick all ${group.aisle} items`}
                >
                  <Icon name="check" size={14} /> Tick all
                </button>
              </div>
              <ul className="shopping-items">
                {group.items.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    leaving={settling[item.id] === "leaving"}
                    onToggle={(it) => toggleBought(it, { animate: true })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {items.length > 0 && toBuy.length === 0 && (
        <div className="all-done glass" role="status">
          <span className="all-done-icon"><Icon name="check" size={22} /></span>
          <div>
            <p className="all-done-title">Shopping done</p>
            <p className="all-done-text">Everything on your list is in the basket.</p>
          </div>
        </div>
      )}

      {pantryItems.length > 0 && (
        <details className="list-drawer pantry glass">
          <summary className="drawer-summary">
            <span className="drawer-heading">
              Check your pantry
              <span className="drawer-sub">
                {pantryItems.length} {pantryItems.length === 1 ? "basic" : "basics"} you may already have
                {pantryChecked > 0 && ` · ${pantryChecked} checked`}
              </span>
            </span>
            <Icon name="arrowRight" size={18} className="drawer-chevron" />
          </summary>
          <div className="drawer-actions">
            {pantryChecked < pantryItems.length ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setBought(pantryItems, true)}>
                <Icon name="check" size={14} /> I have all of these
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setBought(pantryItems, false)}>
                <Icon name="x" size={14} /> Clear all
              </button>
            )}
          </div>
          <ul className="shopping-items drawer-items">
            {pantryItems.map((item) => (
              <ShoppingItem key={item.id} item={item} onToggle={toggleBought} />
            ))}
          </ul>
        </details>
      )}

      {basket.length > 0 && (
        <details className="list-drawer basket glass">
          <summary className="drawer-summary">
            <span className="drawer-heading">
              <span className="basket-heading">
                In your basket
                {/* key restarts the little pop each time the count changes */}
                <span key={basket.length} className="count basket-count">{basket.length}</span>
              </span>
              <span className="drawer-sub">Untick anything to put it back on the list</span>
            </span>
            <Icon name="arrowRight" size={18} className="drawer-chevron" />
          </summary>
          <div className="drawer-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setBought(basket, false)}>
              <Icon name="arrowLeft" size={14} /> Put all back on the list
            </button>
          </div>
          <ul className="shopping-items drawer-items">
            {basket.map((item) => (
              <ShoppingItem key={item.id} item={item} onToggle={toggleBought} />
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}

export default ShoppingList;
