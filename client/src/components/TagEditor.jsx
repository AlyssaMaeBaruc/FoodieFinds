import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

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

// pop-up to pick a meal's tags, create new ones and delete your own.
// meal: the saved meal being edited (null = closed); tags: every tag [{ id, name, is_default }]
// onTagsChanged(tags) after a tag is created or deleted; onSaved(mealId, mealTags) after saving
function TagEditor({ meal, tags, onClose, onTagsChanged, onSaved }) {
  const dialogRef = useRef(null);
  const [selected, setSelected] = useState(new Set());
  const [newName, setNewName] = useState("");
  // custom tag waiting for a second tap on its × before it's deleted
  const [armedId, setArmedId] = useState(null);
  const [busy, setBusy] = useState(null);           // "create" | "delete" | "save"
  const [error, setError] = useState(null);

  // native <dialog>: Esc to close and a backdrop for free
  useEffect(() => {
    const dialog = dialogRef.current;
    if (meal && !dialog.open) {
      setSelected(new Set(meal.tags.map((tag) => tag.id)));
      setNewName("");
      setArmedId(null);
      setError(null);
      dialog.showModal();
    }
    if (!meal && dialog.open) dialog.close();
  }, [meal]);

  const toggle = (id) => {
    setArmedId(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // creates the tag (or finds the existing one with that name) and ticks it
  const createTag = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy("create");
    setError(null);
    try {
      const tag = await sendJson("/api/tags", "POST", { name: newName });
      if (!tags.some((t) => t.id === tag.id)) onTagsChanged([...tags, tag]);
      setSelected((current) => new Set(current).add(tag.id));
      setNewName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // first tap arms the ×, second tap deletes the tag from every meal
  const deleteTag = async (tag) => {
    if (armedId !== tag.id) return setArmedId(tag.id);
    setBusy("delete");
    setError(null);
    try {
      await sendJson(`/api/tags/${tag.id}`, "DELETE");
      onTagsChanged(tags.filter((t) => t.id !== tag.id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(tag.id);
        return next;
      });
      setArmedId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      const data = await sendJson(`/api/recipes/${meal.id}/tags`, "PUT", { tag_ids: [...selected] });
      onSaved(meal.id, data.tags);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="tag-editor glass"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="tag-editor-title"
    >
      {meal && (
        <div className="tag-editor-inner">
          <div className="chooser-header">
            <h2 id="tag-editor-title" className="chooser-title">Edit <span>tags</span></h2>
            <button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
          <p className="tag-editor-meal">{meal.title}</p>

          <ul className="tag-options">
            {tags.map((tag) => {
              const isOn = selected.has(tag.id);
              const armed = armedId === tag.id;
              return (
                <li key={tag.id} className={`tag-option${isOn ? " is-on" : ""}${armed ? " is-armed" : ""}`}>
                  <button type="button" className="tag-toggle" aria-pressed={isOn} onClick={() => toggle(tag.id)}>
                    {isOn && <Icon name="check" size={13} />} {tag.name}
                  </button>
                  {!tag.is_default && (
                    <button
                      type="button"
                      className="tag-delete"
                      onClick={() => deleteTag(tag)}
                      disabled={busy === "delete"}
                      aria-label={armed ? `Tap again to delete the ${tag.name} tag from all meals` : `Delete the ${tag.name} tag`}
                      title={armed ? "Tap again to delete from all meals" : "Delete tag"}
                    >
                      {armed ? "Delete?" : <Icon name="x" size={12} />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <form className="tag-new" onSubmit={createTag}>
            <input
              className="tag-new-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag, e.g. batch cook"
              maxLength={30}
              aria-label="New tag name"
            />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={busy === "create" || !newName.trim()}>
              <Icon name="plus" size={14} /> {busy === "create" ? "Adding…" : "Add tag"}
            </button>
          </form>

          {error && <p className="picker-error">{error}</p>}

          <div className="picker-buttons">
            <button className="btn btn-accent" onClick={save} disabled={busy === "save"}>
              <Icon name="check" size={16} /> {busy === "save" ? "Saving…" : "Save tags"}
            </button>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy === "save"}>Cancel</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default TagEditor;
