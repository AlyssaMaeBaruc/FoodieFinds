--
-- Drop Tables
--

SET foreign_key_checks = 0;
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
