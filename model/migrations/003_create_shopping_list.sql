--
-- Shopping list generated from a week's meal plan.
-- shopping_list holds the items; shopping_list_week records when each week's list
-- was generated and which planned meals it was made from.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/003_create_shopping_list.sql
--

CREATE TABLE shopping_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_start DATE NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NULL,
    unit VARCHAR(50) NOT NULL DEFAULT '',
    aisle VARCHAR(100) NOT NULL DEFAULT 'Other',
    bought BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX idx_shopping_list_week (week_start)
);

CREATE TABLE shopping_list_week (
    week_start DATE PRIMARY KEY,
    generated_at DATETIME NOT NULL,
    meals JSON NOT NULL
);
