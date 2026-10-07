--
-- Cache of Spoonacular recipes' ingredients (already turned into shopping names),
-- so "Fill my week" can compare recipes without spending API points every time.
-- Filled the first time a recipe is needed, and refreshed whenever a shopping list is generated.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/006_ingredient_cache.sql
--

CREATE TABLE cached_recipes (
    spoonacular_id INT PRIMARY KEY,
    ready_in_minutes INT NULL,
    fetched_at DATETIME NOT NULL
);

CREATE TABLE cached_recipe_ingredients (
    spoonacular_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    aisle VARCHAR(100) NULL,
    PRIMARY KEY (spoonacular_id, name),
    CONSTRAINT fk_cached_ingredients_recipe
        FOREIGN KEY (spoonacular_id) REFERENCES cached_recipes(spoonacular_id) ON DELETE CASCADE
);
