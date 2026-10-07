var express = require('express');
var router = express.Router();
const db = require('../model/helper');
const { allTags } = require('../model/mealTags');

// "  Batch   Cook " -> "batch cook"
const cleanTagName = (name) => (typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toLowerCase() : '');
const MAX_TAG_LENGTH = 30;

// ALL TAGS: [{ id, name, is_default }]
router.get('/', async function (req, res) {
  try {
    res.send(await allTags());
  } catch (err) {
    console.error('Error loading tags', err);
    res.status(500).send({ message: "Couldn't load your tags. Please try again." });
  }
});

// CREATE A TAG: { name } -> the tag (or the existing one with that name)
router.post('/', async function (req, res) {
  const name = cleanTagName(req.body.name);
  if (!name || name.length > MAX_TAG_LENGTH) {
    return res.status(400).send({ message: `A tag needs a name of up to ${MAX_TAG_LENGTH} characters` });
  }
  try {
    // IGNORE + SELECT: typing a tag that already exists just gives you that tag
    await db('INSERT IGNORE INTO tags (name) VALUES (?); SELECT 1;', [name]);
    const result = await db('SELECT id, name, is_default FROM tags WHERE name = ?;', [name]);
    const tag = result.data[0];
    res.send({ ...tag, is_default: Boolean(tag.is_default) });
  } catch (err) {
    console.error('Error creating tag', err);
    res.status(500).send({ message: "Couldn't create that tag. Please try again." });
  }
});

// DELETE ONE OF YOUR OWN TAGS (the defaults stay); it comes off every meal too
router.delete('/:id', async function (req, res) {
  try {
    await db('DELETE FROM tags WHERE id = ? AND is_default = FALSE;', [req.params.id]);
    res.send({ deleted: Number(req.params.id) });
  } catch (err) {
    // the helper rejects when nothing was deleted: a default tag, or already gone
    if (err === 'Action not complete') return res.status(404).send({ message: "That tag can't be deleted" });
    console.error('Error deleting tag', err);
    res.status(500).send({ message: "Couldn't delete that tag. Please try again." });
  }
});

module.exports = router;
