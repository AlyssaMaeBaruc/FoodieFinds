--
-- Drop Tables
--

SET foreign_key_checks = 0;
DROP TABLE if exists pantry_ideas_cache;
DROP TABLE if exists pantry_items;
DROP TABLE if exists ingredient_search_cache;
DROP TABLE if exists weekly_rules;
DROP TABLE if exists meal_tags;
DROP TABLE if exists tags;
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
    tags_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    health_score TINYINT UNSIGNED NULL,
    health_checked BOOLEAN NOT NULL DEFAULT FALSE,
    grade_override CHAR(1) NULL,
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
    buy_anyway BOOLEAN NOT NULL DEFAULT FALSE,
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
    health_score TINYINT UNSIGNED NULL,
    health_checked BOOLEAN NOT NULL DEFAULT FALSE,
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

-- tags on saved meals; each meal gets suggested tags once (saved_meals.tags_suggested)
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_tags_name UNIQUE (name)
    );

CREATE TABLE meal_tags (
    saved_meal_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (saved_meal_id, tag_id),
    CONSTRAINT fk_meal_tags_saved_meal
        FOREIGN KEY (saved_meal_id) REFERENCES saved_meals(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

INSERT INTO tags (name, is_default) VALUES
    ('fish', TRUE), ('seafood', TRUE), ('chicken', TRUE), ('beef', TRUE), ('pork', TRUE),
    ('veggie', TRUE), ('eggs', TRUE), ('pasta', TRUE), ('rice', TRUE), ('salad', TRUE);

-- rules for every week, e.g. "at least 4 meals graded A or B"
CREATE TABLE weekly_rules (
    type VARCHAR(40) PRIMARY KEY,
    value INT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE
    );

INSERT INTO weekly_rules (type, value, enabled) VALUES ('min_good_grades', 4, FALSE);

-- ingredients you have at home (no quantities); match_name is the shopping-list name
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

-- Spoonacular ingredient searches, so the same search never costs twice
CREATE TABLE ingredient_search_cache (
    query VARCHAR(100) PRIMARY KEY,
    results JSON NOT NULL,
    searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- "What can I make?" ideas from Spoonacular, saved per pantry (pantry_hash = sha256 of pantry_key)
CREATE TABLE pantry_ideas_cache (
    pantry_key VARCHAR(2000) NOT NULL,
    pantry_hash CHAR(64) PRIMARY KEY,
    results JSON NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
