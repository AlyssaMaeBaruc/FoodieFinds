// Shared helpers for your saved meals (the Library).

// saves a Spoonacular search result ({ id, title, image }) to the library -> its saved meal id
// (already saved counts as saved: the server sends back the existing id)
export async function saveToLibrary(recipe) {
  const res = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: recipe.title, image: recipe.image, spoonacular_id: recipe.id }),
  });
  const data = await res.json().catch(() => ({}));
  if ((!res.ok && res.status !== 409) || !data.id) throw new Error("Couldn't save that recipe. Please try again.");
  return data.id;
}

const clean = (text) => String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// saved meals matching a search, by name, tag or ingredient (every typed word must match one)
// -> [{ meal, hint }], where hint names the ingredient that matched ("has spinach"), if any
export function searchLibrary(meals, query) {
  const words = clean(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const found = [];
  for (const meal of meals) {
    const title = clean(meal.title);
    const tags = (meal.tags ?? []).map((tag) => clean(tag.name));
    const ingredients = (meal.ingredient_names ?? []).map(clean);
    let hint = null;
    const matchesAll = words.every((word) => {
      if (title.includes(word) || tags.some((tag) => tag.startsWith(word))) return true;
      const ingredient = ingredients.find((name) => name.includes(word));
      if (ingredient && !hint) hint = ingredient;
      return Boolean(ingredient);
    });
    if (matchesAll) found.push({ meal, hint, inTitle: words.every((word) => title.includes(word)) });
  }
  // names that match first, then A-Z
  return found
    .sort((a, b) => Number(b.inTitle) - Number(a.inTitle) || a.meal.title.localeCompare(b.meal.title))
    .map(({ meal, hint }) => ({ meal, hint }));
}
