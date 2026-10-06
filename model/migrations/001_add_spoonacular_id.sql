--
-- Add the Spoonacular recipe ID to saved meals.
-- UNIQUE stops the same recipe being saved twice.
-- Nullable so any rows saved before this change still fit (MySQL allows many NULLs in a UNIQUE column).
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/001_add_spoonacular_id.sql
--

ALTER TABLE saved_meals
    ADD COLUMN spoonacular_id INT NULL,
    ADD CONSTRAINT uq_saved_meals_spoonacular_id UNIQUE (spoonacular_id);
