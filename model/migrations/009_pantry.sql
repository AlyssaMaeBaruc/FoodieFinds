--
-- Pantry: ingredients you have at home, by location (no quantities).
--   match_name:         the shopping-list name ("feta cheese" -> "feta"), used to match list items
--   from_list_item_id:  the shopping list item whose tick added it (so unticking can undo it)
-- Plus a cache of Spoonacular ingredient searches (each search costs a point),
-- and "buy anyway" on shopping list items you have but want to buy again.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/009_pantry.sql
--

CREATE TABLE pantry_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    match_name VARCHAR(255) NOT NULL,
    ingredient_id INT NULL,
    aisle VARCHAR(100) NULL,
    location ENUM('fridge', 'freezer', 'cupboard') NOT NULL DEFAULT 'cupboard',
    use_soon BOOLEAN NOT NULL DEFAULT FALSE,
    from_list_item_id INT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pantry_match_name UNIQUE (match_name)
);

CREATE TABLE ingredient_search_cache (
    query VARCHAR(100) PRIMARY KEY,
    results JSON NOT NULL,
    searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE shopping_list
    ADD COLUMN buy_anyway BOOLEAN NOT NULL DEFAULT FALSE;
