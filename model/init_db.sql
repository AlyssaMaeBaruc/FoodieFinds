--
-- Drop Tables
--

SET foreign_key_checks = 0;
DROP TABLE if exists cached_recipe_ingredients;
DROP TABLE if exists cached_recipes;
DROP TABLE if exists ingredient_translations;
DROP TABLE if exists custom_ingredients;
DROP TABLE if exists shopping_list;
DROP TABLE if exists shopping_list_week;
DROP TABLE if exists meal_plan;
DROP TABLE if exists saved_meals;
SET foreign_key_checks = 1;

--
-- Create Tables
--

CREATE TABLE saved_meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) not null,
    image VARCHAR(500) NULL,
    spoonacular_id INT NULL,
    source_url VARCHAR(1000) NULL,
    steps JSON NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_saved_meals_spoonacular_id UNIQUE (spoonacular_id)
    );

-- one meal per day + slot; removing a saved meal removes it from the plan
CREATE TABLE meal_plan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    saved_meal_id INT NOT NULL,
    plan_date DATE NOT NULL,
    slot ENUM('lunch', 'dinner') NOT NULL,
    servings INT NOT NULL DEFAULT 2,
    CONSTRAINT fk_meal_plan_saved_meal
        FOREIGN KEY (saved_meal_id) REFERENCES saved_meals(id) ON DELETE CASCADE,
    CONSTRAINT uq_meal_plan_slot UNIQUE (plan_date, slot)
    );

-- shopping list items, and when/from which meals each week's list was generated
CREATE TABLE shopping_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_start DATE NOT NULL,
    ingredient_id INT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    aisle VARCHAR(100) NOT NULL DEFAULT 'Other',
    bought BOOLEAN NOT NULL DEFAULT FALSE,
    used_in JSON NULL,
    INDEX idx_shopping_list_week (week_start)
    );

CREATE TABLE shopping_list_week (
    week_start DATE PRIMARY KEY,
    generated_at DATETIME NOT NULL,
    meals JSON NOT NULL
    );

-- parsed ingredients of custom recipes (added from a link or by hand)
CREATE TABLE custom_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    saved_meal_id INT NOT NULL,
    position INT NOT NULL,
    original VARCHAR(500) NOT NULL,
    name VARCHAR(255) NOT NULL,
    ingredient_id INT NULL,
    aisle VARCHAR(100) NULL,
    image VARCHAR(255) NULL,
    CONSTRAINT fk_custom_ingredients_saved_meal
        FOREIGN KEY (saved_meal_id) REFERENCES saved_meals(id) ON DELETE CASCADE
    );

-- Spanish -> English ingredient words taught in the review step
CREATE TABLE ingredient_translations (
    spanish VARCHAR(255) PRIMARY KEY,
    english VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- cache of Spoonacular recipes' ingredients (as shopping names), used by "Fill my week"
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
