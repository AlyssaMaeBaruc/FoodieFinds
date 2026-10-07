var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { RULE_TYPES, loadRules } = require('../model/weeklyRules');

// ALL RULES: { min_good_grades: { value: 4, enabled: false } }
router.get('/', async function (req, res) {
  try {
    res.send(await loadRules());
  } catch (err) {
    console.error('Error loading weekly rules', err);
    res.status(500).send({ message: "Couldn't load your weekly rules. Please try again." });
  }
});

// CHANGE ONE RULE: { type: "min_good_grades", value: 5, enabled: true } -> all rules
router.put('/', async function (req, res) {
  const { type, value, enabled } = req.body;
  const ruleType = RULE_TYPES[type];
  if (!ruleType || !Number.isInteger(value) || value < ruleType.min || value > ruleType.max || typeof enabled !== 'boolean') {
    return res.status(400).send({ message: 'That rule needs a whole number in range and an on/off setting' });
  }
  try {
    // SELECT 1 keeps the helper happy when nothing changed (same value saved twice)
    await db(
      `INSERT INTO weekly_rules (type, value, enabled) VALUES (?, ?, ?) AS new
       ON DUPLICATE KEY UPDATE value = new.value, enabled = new.enabled; SELECT 1;`,
      [type, value, enabled]
    );
    res.send(await loadRules());
  } catch (err) {
    console.error('Error saving weekly rule', err);
    res.status(500).send({ message: "Couldn't save that rule. Please try again." });
  }
});

module.exports = router;
