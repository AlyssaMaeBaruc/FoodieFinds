--
-- Health grades (A-E) from Spoonacular's healthScore (0-100), plus weekly rules.
--   cached_recipes.health_score:  Spoonacular recipes (fetched with their ingredients)
--   saved_meals.health_score:     custom recipes (estimated by Spoonacular's recipe analyzer)
--   saved_meals.grade_override:   a grade you picked yourself; always wins
--   health_checked:               we already asked Spoonacular, so don't ask again
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/008_health_grades.sql
--

ALTER TABLE cached_recipes
    ADD COLUMN health_score TINYINT UNSIGNED NULL,
    ADD COLUMN health_checked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE saved_meals
    ADD COLUMN health_score TINYINT UNSIGNED NULL,
    ADD COLUMN health_checked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN grade_override CHAR(1) NULL;

-- rules for every week, e.g. "at least 4 meals graded A or B"
CREATE TABLE weekly_rules (
    type VARCHAR(40) PRIMARY KEY,
    value INT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO weekly_rules (type, value, enabled) VALUES ('min_good_grades', 4, FALSE);
