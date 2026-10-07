import { useState, useEffect, useRef } from "react";
import Icon from "../components/Icon";

const LOCATIONS = [
  { id: "fridge", label: "Fridge", icon: "fridge", hint: "Fresh and chilled" },
  { id: "freezer", label: "Freezer", icon: "snowflake", hint: "Frozen" },
  { id: "cupboard", label: "Cupboard", icon: "cupboard", hint: "Dry and tins" },
];
const locationById = Object.fromEntries(LOCATIONS.map((location) => [location.id, location]));
// wait for a pause in typing before searching (each new Spoonacular search costs a point)
const SEARCH_DELAY_MS = 400;

const capitalize = (name) => name.charAt(0).toUpperCase() + name.slice(1);

async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

// Fridge / Freezer / Cupboard as three picture tiles
function LocationPicker({ value, onChange, label }) {
  return (
    <div className="location-picker" role="radiogroup" aria-label={label}>
      {LOCATIONS.map((location) => (
        <button
          key={location.id}
          type="button"
          role="radio"
          aria-checked={value === location.id}
          className={`location-tile is-${location.id}${value === location.id ? " is-active" : ""}`}
          onClick={() => onChange(location.id)}
        >
          <span className="location-icon"><Icon name={location.icon} size={20} /></span>
          {location.label}
        </button>
      ))}
    </div>
  );
}

// ingredients you have at home, by where they're kept; no quantities
function Pantry() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  // adding: what's typed, the search results, and the result picked (with where it goes)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const searchId = useRef(0);
  // the item whose "Move to" buttons are showing
  const [movingId, setMovingId] = useState(null);

  useEffect(() => {
    fetch("/api/pantry")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load your pantry. Please try again later.");
        return data;
      })
      .then(setItems)
      .catch((err) => {
        setError(err.message);
        console.error(err);
      });
  }, []);

  // search after a pause; answers for older searches are ignored
  useEffect(() => {
    const q = query.trim();
    if (picked || q.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const id = ++searchId.current;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/pantry/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const data = await res.json().catch(() => ([]));
          if (!res.ok) throw new Error(data.message || "Couldn't search right now.");
          return data;
        })
        .then((data) => id === searchId.current && setResults(data))
        .catch((err) => id === searchId.current && setError(err.message))
        .finally(() => id === searchId.current && setSearching(false));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, picked]);

  const pick = (result) => {
    setPicked(result);
    setQuery(result.name);
    setMessage(null);
    setError(null);
  };

  // nothing matched: add exactly what was typed (without a Spoonacular id)
  const pickTyped = () => pick({ name: query.trim().toLowerCase(), ingredient_id: null, aisle: null, image: null, location: "cupboard", typed: true });

  const resetAdd = () => {
    setPicked(null);
    setQuery("");
    setResults([]);
  };

  const addPicked = async () => {
    setAdding(true);
    setError(null);
    try {
      const item = await sendJson("/api/pantry", "POST", {
        name: picked.name,
        ingredient_id: picked.ingredient_id,
        aisle: picked.aisle,
        image: picked.image,
        location: picked.location,
      });
      const place = locationById[item.location]?.label.toLowerCase() ?? item.location;
      if (item.already_there) {
        setMessage(`${capitalize(item.name)} is already in your ${place}.`);
      } else {
        setItems((current) => [...current, item]);
        setMessage(`Added ${item.name} to your ${place}.`);
      }
      resetAdd();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  // changes show straight away and are put back if saving fails
  const updateItem = async (item, changes) => {
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, ...changes } : i)));
    try {
      await sendJson(`/api/pantry/${item.id}`, "PATCH", changes);
    } catch (err) {
      setItems((current) => current.map((i) => (i.id === item.id ? item : i)));
      setError(err.message);
    }
  };

  const removeItem = async (item) => {
    setItems((current) => current.filter((i) => i.id !== item.id));
    try {
      await sendJson(`/api/pantry/${item.id}`, "DELETE");
    } catch (err) {
      setItems((current) => [...current, item]);
      setError(err.message);
    }
  };

  // "use soon" first, then A-Z
  const inLocation = (location) => (items ?? [])
    .filter((item) => item.location === location)
    .sort((a, b) => Number(b.use_soon) - Number(a.use_soon) || a.name.localeCompare(b.name));
  const useSoonCount = (items ?? []).filter((item) => item.use_soon).length;
  const showTypedOption = !picked && query.trim().length >= 2 && !searching
    && !results.some((r) => r.name === query.trim().toLowerCase());

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Your kitchen</p>
        <h1 className="hero-title">My <span>pantry</span></h1>
        <p className="hero-text">
          {items === null
            ? "What you have at home, so the shopping list only shows what you need."
            : `${items.length} ${items.length === 1 ? "ingredient" : "ingredients"} at home`}
          {useSoonCount > 0 && <> · <strong className="use-soon-total">{useSoonCount} to use soon</strong></>}
        </p>
      </section>

      <section className="pantry-add glass">
        <label className="field">
          <span className="field-label">Add an ingredient</span>
          <span className="pantry-search">
            <Icon name="search" size={18} />
            <input
              className="field-input"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setMessage(null); }}
              placeholder="e.g. eggs, spinach, rice"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls="pantry-results"
            />
          </span>
        </label>

        {!picked && (results.length > 0 || showTypedOption) && (
          <ul id="pantry-results" className="pantry-results" role="listbox">
            {results.map((result) => (
              <li key={`${result.source}-${result.name}`}>
                <button
                  type="button"
                  className="pantry-result"
                  onClick={() => pick(result)}
                  disabled={result.in_pantry}
                  role="option"
                  aria-selected="false"
                >
                  <span className="pantry-result-name">{capitalize(result.name)}</span>
                  <span className="pantry-result-meta">
                    {result.in_pantry ? "In your pantry" : result.source === "yours" ? "From your recipes" : result.aisle ?? ""}
                  </span>
                </button>
              </li>
            ))}
            {showTypedOption && (
              <li>
                <button type="button" className="pantry-result is-typed" onClick={pickTyped}>
                  <span className="pantry-result-name"><Icon name="plus" size={14} /> Add &ldquo;{query.trim()}&rdquo;</span>
                  <span className="pantry-result-meta">as typed</span>
                </button>
              </li>
            )}
          </ul>
        )}
        {searching && !picked && <p className="field-hint">Searching…</p>}

        {picked && (
          <div className="pantry-confirm">
            <p className="pantry-confirm-name">Where do you keep <strong>{picked.name}</strong>?</p>
            <LocationPicker value={picked.location} onChange={(location) => setPicked({ ...picked, location })} label="Where it's kept" />
            <div className="picker-buttons">
              <button className="btn btn-accent btn-sm" onClick={addPicked} disabled={adding}>
                <Icon name="plus" size={14} /> {adding ? "Adding…" : "Add"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={resetAdd} disabled={adding}>Cancel</button>
            </div>
          </div>
        )}
        {message && <p className="plan-message"><Icon name="check" size={16} /> {message}</p>}
      </section>

      {error && <div className="error-message glass"><Icon name="alert" size={18} /> {error}</div>}
      {items === null && !error && <p className="empty-state">Loading your pantry…</p>}
      {items?.length === 0 && (
        <p className="empty-state">Nothing here yet. Add what you have, or tick items as bought on your shopping list and they'll appear here.</p>
      )}

      {items?.length > 0 && (
        <div className="pantry-grid">
          {LOCATIONS.map((location) => {
            const shelf = inLocation(location.id);
            return (
              <section key={location.id} className={`aisle-card pantry-shelf is-${location.id} glass`}>
                <div className="shelf-header">
                  <span className="location-icon"><Icon name={location.icon} size={20} /></span>
                  <span>
                    <h2 className="aisle-title">
                      {location.label}
                      <span className="count">{shelf.length}</span>
                    </h2>
                    <span className="shelf-hint">{location.hint}</span>
                  </span>
                </div>
                {shelf.length === 0 ? (
                  <p className="pantry-empty">Nothing in your {location.label.toLowerCase()} yet</p>
                ) : (
                  <ul className="pantry-items">
                    {shelf.map((item) => (
                      <li key={item.id} className={`pantry-item${item.use_soon ? " is-use-soon" : ""}`}>
                        <div className="pantry-item-row">
                          <span className="pantry-item-name">{capitalize(item.name)}</span>
                          <button
                            type="button"
                            className={`use-soon-button${item.use_soon ? " is-on" : ""}`}
                            onClick={() => updateItem(item, { use_soon: !item.use_soon })}
                            aria-pressed={item.use_soon}
                            title={item.use_soon ? "Marked to use soon" : "Mark to use soon"}
                          >
                            <Icon name="clock" size={13} /> Use soon
                          </button>
                          <button
                            type="button"
                            className={`pantry-icon-button${movingId === item.id ? " is-open" : ""}`}
                            onClick={() => setMovingId(movingId === item.id ? null : item.id)}
                            aria-expanded={movingId === item.id}
                            aria-label={`Move ${item.name}`}
                            title="Move"
                          >
                            <Icon name="move" size={15} />
                          </button>
                          <button
                            type="button"
                            className="pantry-icon-button is-remove"
                            onClick={() => removeItem(item)}
                            aria-label={`Remove ${item.name}`}
                            title="Remove"
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                        {movingId === item.id && (
                          <div className="move-to">
                            <span className="move-to-label">Move to</span>
                            {LOCATIONS.filter((l) => l.id !== item.location).map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                className={`move-chip is-${l.id}`}
                                onClick={() => { updateItem(item, { location: l.id }); setMovingId(null); }}
                              >
                                <Icon name={l.icon} size={14} /> {l.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default Pantry;
