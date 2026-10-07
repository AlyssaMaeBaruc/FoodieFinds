// "Fill my week": picks a saved meal for each empty slot, favouring recipes that are
// easy to make with what the week already needs (so the shopping list stays short).
// Pure functions (no database or network) so they are easy to test.

const { isGoodGrade } = require('./healthGrade');

// --- Tuning (edit freely) ------------------------------------------------------
const WEIGHTS = {
  coverage: 3,        // x share of the recipe's ingredients already being bought (0..1)
  newIngredient: -0.4, // per extra ingredient it would add to the shopping list
  fewIngredients: 0.5, // recipe with up to 6 ingredients (0.25 for up to 10)
  quick: 0.4,          // ready in 30 minutes or less (0.2 for up to 45)
  repeat: -1.5,        // meal is already in the week once (cook once, eat twice)
  lastWeek: -1.5,      // meal was planned the week before
  // health grade: a nudge towards healthier meals (never outweighs sharing ingredients)
  grade: { A: 0.6, B: 0.3, C: 0, D: -0.3, E: -0.6 },
  // pantry: per ingredient you already have (up to max), and more for "Use soon" items
  // (a "Use soon" item only counts for the first meal that uses it in the week)
  pantry: 0.3,
  pantryMax: 0.9,
  useSoon: 0.8,
  useSoonMax: 1.6,
};
const MAX_USES_PER_WEEK = 2;
// pick randomly among this many best candidates, favouring the best...
const TOP_CHOICES = [0.6, 0.3, 0.1];
// ...but only among those scoring within this much of the best one
const MAX_SCORE_GAP = 1;
// the A/B goal starts choosing only A/B meals this many slots before it strictly has to,
// so a meal that can't repeat on the same day doesn't make it miss the goal at the end
const GOAL_SLACK = 2;
// -----------------------------------------------------------------------------

function easyBonus(meal) {
  const count = meal.ingredients.length;
  let bonus = count <= 6 ? WEIGHTS.fewIngredients : count <= 10 ? WEIGHTS.fewIngredients / 2 : 0;
  if (meal.minutes) bonus += meal.minutes <= 30 ? WEIGHTS.quick : meal.minutes <= 45 ? WEIGHTS.quick / 2 : 0;
  return bonus;
}

// pantry items a meal uses: [{ name, use_soon }] (worked out by the route)
const pantryOf = (meal) => meal.pantry ?? [];

// how well a meal fits the week so far, plus what it shares and adds
// weekIngredients: Map of ingredient name -> how many meals in the week use it
// uses: how many times this meal is already in the week
// soonUsed: "Use soon" items already used by another meal this week
function scoreMeal(meal, weekIngredients, uses, lastWeekIds, soonUsed = new Set()) {
  const inPantry = new Set(pantryOf(meal).map((p) => p.name));
  // a repeat only "shares" ingredients that OTHER meals also use (not just its own),
  // and adds nothing new to the shopping list
  const usedByOthers = (name) => (weekIngredients.get(name) ?? 0) - uses > 0;
  const shared = meal.ingredients.filter(usedByOthers);
  // things you already have at home aren't "new" (nothing to buy)
  const added = uses > 0 ? [] : meal.ingredients.filter((name) => !weekIngredients.has(name) && !inPantry.has(name));
  const coverage = meal.ingredients.length > 0 ? shared.length / meal.ingredients.length : 0;

  let score = WEIGHTS.coverage * coverage + WEIGHTS.newIngredient * added.length + easyBonus(meal);
  if (uses > 0) score += WEIGHTS.repeat;
  if (lastWeekIds.has(meal.saved_meal_id)) score += WEIGHTS.lastWeek;
  score += WEIGHTS.grade[meal.grade] ?? 0;
  const freshSoon = pantryOf(meal).filter((p) => p.use_soon && !soonUsed.has(p.name));
  score += Math.min(WEIGHTS.pantryMax, WEIGHTS.pantry * inPantry.size);
  score += Math.min(WEIGHTS.useSoonMax, WEIGHTS.useSoon * freshSoon.length);
  return { score, shared, added };
}

// weighted random pick among the best few
function pickTop(scored, random) {
  const top = scored.slice(0, TOP_CHOICES.length).filter((c) => c.score >= scored[0].score - MAX_SCORE_GAP);
  const weights = TOP_CHOICES.slice(0, top.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < top.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return top[i];
  }
  return top[top.length - 1];
}

// library: [{ saved_meal_id, title, image, spoonacular_id, is_custom, ingredients: [names], minutes, grade }]
//          (ingredients already without pantry basics)
// fixed:   [{ plan_date, saved_meal_id }] meals already in the week (planned + suggestions being kept)
// slots:   [{ plan_date, slot }] empty slots to fill, in the order to fill them
// avoidIds: saved meal ids not to suggest (e.g. what a shuffled slot had before)
// minGood:  weekly rule "at least this many meals graded A or B" (null = off)
// returns { suggestions: [...], unfilled: [{ plan_date, slot }],
//           goal: { target, count, good_in_library } when minGood is set, else null }
function fillWeek({ library, fixed, slots, lastWeekIds = new Set(), avoidIds = new Set(), minGood = null, random = Math.random }) {
  const byId = new Map(library.map((meal) => [meal.saved_meal_id, meal]));
  const isGood = (id) => isGoodGrade(byId.get(id)?.grade);
  let goodCount = 0;
  const soonUsed = new Set();
  const uses = new Map();
  const weekIngredients = new Map();
  // date -> meal ids on that day, so a meal is never eaten twice the same day
  const byDate = new Map();
  const addToWeek = (id, date) => {
    uses.set(id, (uses.get(id) ?? 0) + 1);
    if (isGood(id)) goodCount += 1;
    for (const p of pantryOf(byId.get(id) ?? {})) if (p.use_soon) soonUsed.add(p.name);
    for (const name of byId.get(id)?.ingredients ?? []) weekIngredients.set(name, (weekIngredients.get(name) ?? 0) + 1);
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date).add(id);
  };
  fixed.forEach((meal) => addToWeek(meal.saved_meal_id, meal.plan_date));

  const suggestions = [];
  const unfilled = [];
  slots.forEach((slot, index) => {
    const sameDay = byDate.get(slot.plan_date) ?? new Set();
    let candidates = library.filter((meal) => (uses.get(meal.saved_meal_id) ?? 0) < MAX_USES_PER_WEEK
      && !avoidIds.has(meal.saved_meal_id)
      && !sameDay.has(meal.saved_meal_id));
    // the A/B goal needs (nearly) every remaining slot: only A/B meals from here (if any fit)
    const slotsLeft = slots.length - index;
    const goodNeeded = minGood === null ? 0 : minGood - goodCount;
    if (goodNeeded > 0 && goodNeeded + GOAL_SLACK >= slotsLeft) {
      const good = candidates.filter((meal) => isGoodGrade(meal.grade));
      if (good.length > 0) candidates = good;
    }
    const scored = candidates
      .map((meal) => ({ meal, ...scoreMeal(meal, weekIngredients, uses.get(meal.saved_meal_id) ?? 0, lastWeekIds, soonUsed) }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      unfilled.push(slot);
      return;
    }
    const choice = pickTop(scored, random);
    suggestions.push({
      ...slot,
      saved_meal_id: choice.meal.saved_meal_id,
      title: choice.meal.title,
      image: choice.meal.image,
      spoonacular_id: choice.meal.spoonacular_id,
      is_custom: Boolean(choice.meal.is_custom),
      shared: choice.shared,
      added: choice.added,
      minutes: choice.meal.minutes,
      repeat: (uses.get(choice.meal.saved_meal_id) ?? 0) > 0,
      from_last_week: lastWeekIds.has(choice.meal.saved_meal_id),
      grade: choice.meal.grade ?? null,
      from_pantry: pantryOf(choice.meal),
    });
    addToWeek(choice.meal.saved_meal_id, slot.plan_date);
  });
  const goal = minGood === null ? null : {
    target: minGood,
    count: goodCount,
    good_in_library: library.filter((meal) => isGoodGrade(meal.grade)).length,
  };
  return { suggestions, unfilled, goal };
}

module.exports = { fillWeek, scoreMeal, WEIGHTS };
