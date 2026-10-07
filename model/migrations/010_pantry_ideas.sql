--
-- "What can I make?" ideas from Spoonacular (findByIngredients, about 1 point each), saved per
-- pantry so opening the page again is free until the pantry changes.
--   pantry_key: the pantry's ingredients (and which are "use soon"), joined in a fixed order
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/010_pantry_ideas.sql
--

CREATE TABLE pantry_ideas_cache (
    pantry_key VARCHAR(2000) NOT NULL,
    pantry_hash CHAR(64) PRIMARY KEY,
    results JSON NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
