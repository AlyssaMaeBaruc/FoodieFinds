// Rules that apply to every week. Each rule type has a value and an on/off switch.

const db = require('./helper');

// rule type -> its default and allowed range (add new rule types here)
const RULE_TYPES = {
  // at least `value` meals graded A or B in the week
  min_good_grades: { value: 4, min: 1, max: 14 },
};

// { min_good_grades: { value: 4, enabled: false }, ... }
async function loadRules() {
  const result = await db('SELECT type, value, enabled FROM weekly_rules;');
  const rules = Object.fromEntries(Object.entries(RULE_TYPES).map(([type, { value }]) => [type, { value, enabled: false }]));
  for (const row of result.data) {
    if (rules[row.type]) rules[row.type] = { value: row.value, enabled: Boolean(row.enabled) };
  }
  return rules;
}

module.exports = { RULE_TYPES, loadRules };
