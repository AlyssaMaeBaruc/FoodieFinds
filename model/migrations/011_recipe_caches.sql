--
-- Saved Spoonacular answers, now that recipe searches and recipe pages go through the server
-- (the API key no longer has to be in the browser):
--   recipe_search_cache: one page of search results per search (same search again = free)
--   recipe_info_cache:   one recipe's full details, for its recipe page
--
-- Run once against the existing database:
--   mysql -u root -p mvp < model/migrations/011_recipe_caches.sql
--

CREATE TABLE recipe_search_cache (
    search_hash CHAR(64) PRIMARY KEY,
    search_key VARCHAR(1000) NOT NULL,
    results JSON NOT NULL,
    total_results INT NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_info_cache (
    spoonacular_id INT PRIMARY KEY,
    data JSON NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
