--
-- Weekly meal plan: which saved meal is planned for which day and slot.
-- One meal per day + slot (UNIQUE), and deleting a saved meal removes it from the plan (CASCADE).
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/002_create_meal_plan.sql
--

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
