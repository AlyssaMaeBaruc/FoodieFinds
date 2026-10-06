--
-- Simpler shopping list: one line per ingredient, no amounts or units,
-- plus which planned meals use each ingredient.
-- Existing lists are cleared (they can't be converted); regenerate once afterwards.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/004_simplify_shopping_list.sql
--

DELETE FROM shopping_list;
DELETE FROM shopping_list_week;

ALTER TABLE shopping_list
    DROP COLUMN amount,
    DROP COLUMN unit,
    ADD COLUMN ingredient_id INT NULL AFTER week_start,
    ADD COLUMN used_in JSON NULL;
