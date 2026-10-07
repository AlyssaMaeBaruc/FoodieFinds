// Health grade (A-E) from Spoonacular's healthScore (0-100). Pure functions.

// --- Tuning (edit freely) ------------------------------------------------------
// lowest score for each grade
const GRADE_BANDS = [
  ['A', 80],
  ['B', 60],
  ['C', 40],
  ['D', 20],
  ['E', 0],
];
// -----------------------------------------------------------------------------

const GRADES = GRADE_BANDS.map(([grade]) => grade);
// grades that count for "at least X meals graded A or B"
const GOOD_GRADES = new Set(['A', 'B']);

// 69 -> "B"; null when there is no score
function gradeFor(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return null;
  return GRADE_BANDS.find(([, min]) => Number(score) >= min)?.[0] ?? 'E';
}

// a saved meal row with health_score and grade_override -> { grade, grade_source, auto_grade }
// grade_source: "override" (you picked it), "spoonacular", or null (no grade yet)
// auto_grade: what Spoonacular's score gives, even when you've picked your own
function mealGrade({ health_score: score, grade_override: override }) {
  const autoGrade = gradeFor(score);
  if (GRADES.includes(override)) return { grade: override, grade_source: 'override', auto_grade: autoGrade };
  return { grade: autoGrade, grade_source: autoGrade ? 'spoonacular' : null, auto_grade: autoGrade };
}

const isGoodGrade = (grade) => GOOD_GRADES.has(grade);

// SQL pieces to read a saved meal's score (alias sm = saved_meals): Spoonacular recipes keep
// theirs in the cache, custom recipes on the meal itself
const HEALTH_COLUMNS = 'IF(sm.spoonacular_id IS NULL, sm.health_score, cr.health_score) AS health_score, sm.grade_override';
const HEALTH_JOIN = 'LEFT JOIN cached_recipes cr ON cr.spoonacular_id = sm.spoonacular_id';

// adds grade and grade_source to a row read with HEALTH_COLUMNS
const withGrade = (row) => ({ ...row, ...mealGrade(row) });

module.exports = { GRADES, gradeFor, mealGrade, isGoodGrade, withGrade, HEALTH_COLUMNS, HEALTH_JOIN };
