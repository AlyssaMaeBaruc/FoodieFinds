--
-- Drop Tables
--

SET foreign_key_checks = 0;
DROP TABLE if exists meal_plan;
DROP TABLE if exists saved_meals;
SET foreign_key_checks = 1;

--
-- Create Tables
--

CREATE TABLE saved_meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) not null,
    image VARCHAR(255) not null,
    spoonacular_id INT NULL,
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
