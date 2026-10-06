// Turns a Spoonacular recipe into clean instruction sections: [{ name, steps: ["...", ...] }]
//
// Spoonacular sends instructions twice:
//  - recipe.instructions: the author's original text (often an HTML <ol> list)
//  - recipe.analyzedInstructions: Spoonacular's own split into steps, which sometimes
//    breaks sentences apart ("Pre-" / "Heat oven…") or glues them together ("350 FSeason…")
// So the author's list is preferred, and the analyzed steps are repaired before use.

// adds the missing space in "degrees.In a bowl" and tidies whitespace
function tidy(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/([a-z0-9)])([.!?])([A-Z])/g, "$1$2 $3")
    .trim();
}

// reads the author's HTML as plain text (DOMParser never runs scripts or loads images)
function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html").body;
}

// 1. the author's own numbered/bulleted list
function stepsFromList(html) {
  const body = parseHtml(html);
  // innermost <li>s only, so nested lists aren't repeated
  return [...body.querySelectorAll("li")]
    .filter((li) => !li.querySelector("li"))
    .map((li) => tidy(li.textContent))
    .filter(Boolean);
}

// 2. Spoonacular's steps, with sentences it broke apart joined back together
function repairSteps(steps) {
  const repaired = [];
  for (const raw of steps) {
    const step = tidy(raw);
    if (!step) continue;
    const previous = repaired[repaired.length - 1];
    if (previous !== undefined) {
      // "Pre-" + "Heat oven…" -> "Pre-Heat oven…"
      if (previous.endsWith("-")) {
        repaired[repaired.length - 1] = previous + step;
        continue;
      }
      // a step with no ending punctuation followed by one starting in lowercase is one sentence
      if (!/[.!?:)]$/.test(previous) && /^[a-z]/.test(step)) {
        repaired[repaired.length - 1] = `${previous} ${step}`;
        continue;
      }
    }
    repaired.push(step);
  }
  return repaired;
}

// 3. the author's text split into lines or paragraphs
function stepsFromText(html) {
  const body = parseHtml(html.replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n"));
  return body.textContent
    .split(/\n+/)
    .map(tidy)
    .filter(Boolean);
}

export function getInstructionSections(recipe) {
  const html = recipe?.instructions ?? "";

  const listSteps = html ? stepsFromList(html) : [];
  if (listSteps.length >= 2) return [{ name: "", steps: listSteps }];

  const analyzed = (recipe?.analyzedInstructions ?? [])
    .map((section) => ({ name: tidy(section.name ?? ""), steps: repairSteps(section.steps.map((s) => s.step)) }))
    .filter((section) => section.steps.length > 0);
  if (analyzed.length > 0) return analyzed;

  const textSteps = html ? stepsFromText(html) : [];
  return textSteps.length > 0 ? [{ name: "", steps: textSteps }] : [];
}
