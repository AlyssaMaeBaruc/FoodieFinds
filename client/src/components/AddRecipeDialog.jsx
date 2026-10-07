import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import RecipeImage from './RecipeImage';

const EMPTY_MANUAL = { title: "", image: "", source: "", ingredients: "", steps: "" };

// one non-empty line per entry
const toLines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);
const capitalize = (name) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// "Add recipe" pop-up: paste a link or type it in, review the ingredients, then save.
// open: boolean; onClose(); onSaved() after a recipe is saved
function AddRecipeDialog({ open, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [tab, setTab] = useState("link");          // "link" | "manual"
  const [step, setStep] = useState("form");        // "form" | "review"

  const [url, setUrl] = useState("");
  const [manual, setManual] = useState(EMPTY_MANUAL);
  // shown on the manual form after a link couldn't be read
  const [notice, setNotice] = useState(null);

  // the recipe being reviewed: { title, image, source_url, steps, ingredients }
  // each ingredient may carry `fix`: the English name typed for a flagged line
  const [draft, setDraft] = useState(null);

  const [busy, setBusy] = useState(null);          // "import" | "check" | "recheck" | "save"
  const [error, setError] = useState(null);

  // native <dialog>: focus trapping, Esc to close and a backdrop for free
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setTab("link");
      setStep("form");
      setUrl("");
      setManual(EMPTY_MANUAL);
      setNotice(null);
      setDraft(null);
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const switchTab = (next) => {
    setTab(next);
    setStep("form");
    setError(null);
  };

  // ---- a. paste a link ----
  const importLink = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy("import");
    setError(null);
    try {
      const { ok, data } = await postJson("/api/custom-recipes/extract", { url: url.trim() });
      if (!ok) {
        // failed link: switch to the manual form with the link kept as the source
        setManual({ ...EMPTY_MANUAL, source: url.trim() });
        setNotice(`${data.message || "Couldn't read that link."} You can add it by hand below; the link is saved as the source.`);
        setTab("manual");
        setStep("form");
        return;
      }
      setDraft(data);
      setStep("review");
    } catch (err) {
      setManual({ ...EMPTY_MANUAL, source: url.trim() });
      setNotice("Couldn't read that link. You can add it by hand below; the link is saved as the source.");
      setTab("manual");
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  // ---- b. add manually ----
  const checkIngredients = async (e) => {
    e.preventDefault();
    const lines = toLines(manual.ingredients);
    if (!manual.title.trim()) return setError("Give the recipe a name.");
    if (lines.length === 0) return setError("Add at least one ingredient, one per line.");

    setBusy("check");
    setError(null);
    try {
      const { ok, data } = await postJson("/api/custom-recipes/parse", { lines });
      if (!ok) throw new Error(data.message || "Couldn't read the ingredients. Please try again.");
      setDraft({
        title: manual.title.trim(),
        image: manual.image.trim() || null,
        source_url: manual.source.trim() || null,
        steps: toLines(manual.steps),
        ingredients: data.ingredients,
      });
      setStep("review");
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  // ---- review ----
  const updateDraft = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const updateIngredient = (index, changes) =>
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ing, i) => (i === index ? { ...ing, ...changes } : ing)),
    }));
  const removeIngredient = (index) =>
    setDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, i) => i !== index) }));

  const flaggedWithFix = (draft?.ingredients ?? [])
    .map((ing, index) => ({ ing, index }))
    .filter(({ ing }) => !ing.recognized && ing.fix?.trim());

  // re-read only the lines you gave an English name, in one call
  const recheck = async () => {
    if (flaggedWithFix.length === 0) return;
    setBusy("recheck");
    setError(null);
    try {
      const { ok, data } = await postJson("/api/custom-recipes/parse", {
        lines: flaggedWithFix.map(({ ing }) => ing.fix.trim()),
      });
      if (!ok) throw new Error(data.message || "Couldn't check those names. Please try again.");
      flaggedWithFix.forEach(({ ing, index }, i) => {
        const result = data.ingredients[i];
        updateIngredient(index, {
          recognized: result.recognized,
          name: result.recognized ? result.name : ing.fix.trim(),
          ingredient_id: result.ingredient_id,
          aisle: result.aisle,
          image: result.image,
          // remember the word you taught, even if Spoonacular still doesn't know it
          taught: ing.fix.trim(),
        });
      });
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  // back to the manual form with everything found so far
  const editByHand = () => {
    setManual({
      title: draft.title || "",
      image: draft.image || "",
      source: draft.source_url || "",
      ingredients: draft.ingredients.map((ing) => ing.original).join("\n"),
      steps: (draft.steps || []).join("\n"),
    });
    setNotice(null);
    setTab("manual");
    setStep("form");
  };

  const save = async () => {
    if (!draft.title?.trim()) return setError("Give the recipe a name.");
    if (draft.ingredients.length === 0) return setError("Keep at least one ingredient.");

    // a typed English name (rechecked or not) is the shopping name, and is learned for next time
    const ingredients = draft.ingredients.map((ing) => {
      const typed = ing.taught || ing.fix?.trim();
      return {
        original: ing.original,
        name: ing.recognized ? ing.name : typed || ing.name,
        ingredient_id: ing.recognized ? ing.ingredient_id : null,
        aisle: ing.recognized ? ing.aisle : null,
        image: ing.recognized ? ing.image : null,
      };
    });
    const learned = draft.ingredients
      .map((ing) => ({ spanish: ing.core, english: ing.taught || ing.fix?.trim() }))
      .filter((pair) => pair.spanish && pair.english);

    setBusy("save");
    setError(null);
    try {
      const { ok, data } = await postJson("/api/custom-recipes", {
        title: draft.title.trim(),
        image: draft.image || null,
        source_url: draft.source_url || null,
        steps: draft.steps || [],
        ingredients,
        learned,
      });
      if (!ok) throw new Error(data.message || "Couldn't save the recipe. Please try again.");
      onSaved();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const flaggedCount = draft ? draft.ingredients.filter((ing) => !ing.recognized).length : 0;

  return (
    <dialog
      ref={dialogRef}
      className="add-recipe glass"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="add-recipe-title"
    >
      {open && (
        <div className="add-recipe-inner">
          <div className="chooser-header">
            <h2 id="add-recipe-title" className="chooser-title">
              {step === "review" ? <>Review <span>recipe</span></> : <>Add a <span>recipe</span></>}
            </h2>
            <button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>

          {step === "form" && (
            <div className="slot-toggle add-recipe-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "link"} className={`slot-option${tab === "link" ? " is-active" : ""}`} onClick={() => switchTab("link")}>
                Paste a link
              </button>
              <button type="button" role="tab" aria-selected={tab === "manual"} className={`slot-option${tab === "manual" ? " is-active" : ""}`} onClick={() => switchTab("manual")}>
                Add manually
              </button>
            </div>
          )}

          {error && <p className="picker-error"><Icon name="alert" size={16} /> {error}</p>}

          {/* a. link */}
          {step === "form" && tab === "link" && (
            <form className="add-form" onSubmit={importLink}>
              <label className="field">
                <span className="field-label">Recipe link</span>
                <input
                  type="url"
                  className="field-input"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <p className="field-hint">We'll fill in the name, photo, ingredients and steps for you to review before saving.</p>
              <button type="submit" className="btn btn-accent" disabled={busy === "import"}>
                {busy === "import" ? "Reading the recipe…" : <><Icon name="arrowRight" size={16} /> Import</>}
              </button>
            </form>
          )}

          {/* b. manual */}
          {step === "form" && tab === "manual" && (
            <form className="add-form" onSubmit={checkIngredients}>
              {notice && <p className="notice-inline"><Icon name="alert" size={16} /> {notice}</p>}
              <label className="field">
                <span className="field-label">Name</span>
                <input className="field-input" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} required />
              </label>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Image link <em>optional</em></span>
                  <input type="url" className="field-input" placeholder="https://…" value={manual.image} onChange={(e) => setManual({ ...manual, image: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">Source link <em>optional</em></span>
                  <input type="url" className="field-input" placeholder="https://…" value={manual.source} onChange={(e) => setManual({ ...manual, source: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Ingredients <em>one per line, Spanish or English</em></span>
                <textarea
                  className="field-input"
                  rows={7}
                  placeholder={"2 tomates maduros\n1 cebolla\n200 g de gambas"}
                  value={manual.ingredients}
                  onChange={(e) => setManual({ ...manual, ingredients: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Steps <em>optional, one per line</em></span>
                <textarea
                  className="field-input"
                  rows={4}
                  placeholder={"Chop the onion\nFry it in olive oil until soft"}
                  value={manual.steps}
                  onChange={(e) => setManual({ ...manual, steps: e.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-accent" disabled={busy === "check"}>
                {busy === "check" ? "Reading ingredients…" : <><Icon name="check" size={16} /> Check ingredients</>}
              </button>
            </form>
          )}

          {/* review */}
          {step === "review" && draft && (
            <div className="review">
              <div className="review-head">
                <RecipeImage src={draft.image} className="review-image" />
                <label className="field review-title">
                  <span className="field-label">Name</span>
                  <input className="field-input" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} />
                </label>
              </div>

              <div className="review-summary">
                <span><strong>{draft.ingredients.length}</strong> ingredients</span>
                {flaggedCount > 0 && <span className="flag-count"><Icon name="alert" size={14} /> {flaggedCount} not recognized</span>}
                {draft.steps?.length > 0 && <span>{draft.steps.length} steps</span>}
              </div>
              {flaggedCount > 0 && (
                <p className="field-hint">
                  Type the English name for flagged lines and press Recheck. Each one is remembered for next time.
                </p>
              )}

              <ul className="review-list">
                {draft.ingredients.map((ing, index) => (
                  <li key={index} className={`review-item${ing.recognized ? "" : " is-flagged"}`}>
                    <span className={`review-status${ing.recognized ? "" : " is-flagged"}`}>
                      <Icon name={ing.recognized ? "check" : "alert"} size={14} />
                    </span>
                    <span className="review-text">
                      <span className="review-original">{ing.original}</span>
                      {ing.recognized ? (
                        <span className="review-name">→ {capitalize(ing.name)}</span>
                      ) : (
                        <input
                          className="field-input review-fix"
                          placeholder="English name, e.g. prawns"
                          value={ing.fix ?? ""}
                          onChange={(e) => updateIngredient(index, { fix: e.target.value })}
                          aria-label={`English name for ${ing.original}`}
                        />
                      )}
                    </span>
                    <button className="chip-remove" aria-label={`Remove ${ing.original}`} onClick={() => removeIngredient(index)}>
                      <Icon name="x" size={12} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="review-actions">
                <button className="btn btn-ghost btn-sm" onClick={editByHand}>This isn't right, edit by hand</button>
                {flaggedWithFix.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={recheck} disabled={busy === "recheck"}>
                    {busy === "recheck" ? "Checking…" : `Recheck ${flaggedWithFix.length}`}
                  </button>
                )}
                <button className="btn btn-accent" onClick={save} disabled={busy === "save"}>
                  {busy === "save" ? "Saving…" : <><Icon name="check" size={16} /> Save recipe</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export default AddRecipeDialog;
