--
-- Custom recipes added from any link or by hand.
-- They live in saved_meals (spoonacular_id stays NULL) so This Week and the shopping
-- list treat them like any other saved meal; their parsed ingredients are stored here
-- because there is no Spoonacular recipe to fetch them from.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/005_custom_recipes.sql
--

ALTER TABLE saved_meals
    MODIFY image VARCHAR(500) NULL,
    ADD COLUMN source_url VARCHAR(1000) NULL,
    ADD COLUMN steps JSON NULL,
    ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE;

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
