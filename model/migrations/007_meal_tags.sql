--
-- Tags on saved meals (fish, beef, veggie, ... and your own).
-- Each meal gets suggested tags once, from its ingredients (tags_suggested remembers that),
-- so tags you edit are never overwritten.
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/007_meal_tags.sql
--

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

ALTER TABLE saved_meals
    ADD COLUMN tags_suggested BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO tags (name, is_default) VALUES
    ('fish', TRUE), ('seafood', TRUE), ('chicken', TRUE), ('beef', TRUE), ('pork', TRUE),
    ('veggie', TRUE), ('eggs', TRUE), ('pasta', TRUE), ('rice', TRUE), ('salad', TRUE);
