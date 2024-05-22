# React + Vite

** FRONT END FUNCTIONALITIES

Page 1:
The Homepage provides the following functionalities:

- Input for Ingredients: Users can input ingredients into a search bar.

- Add Ingredients: Users can add multiple ingredients to their list.

- Delete Ingredients: Users can remove ingredients from their list.

- Find Recipes: Users can search for recipes based on the ingredients they've added.
Fetched data from the API:  https://spoonacular.com/food-api/docs#Search-Recipes-by-Ingredients

- Save Meals: Users can save their favorite meals.

State Variables
ingredientsInput: Stores the current input value from the search bar.
addedIngredients: Stores the list of ingredients added by the user.
recipes: Stores the list of recipes fetched from the Spoonacular API.
error: Stores error messages for display when an error occurs.

RecipesList - a component that contains the map method or logic used on the two front end pages. 

Page 2: 

Functionalities: 
Favourite Meals displays the users favourite meals and provide the option to delete any (Called Saved Meals on the web) 

State Variables
mealList: Stores the list of favorite meals fetched from the backend server.

Fetching data from API Endpoints
GET /api/recipes: Fetches the list of saved recipes.
DELETE /api/recipes/:id: Deletes a saved recipe by ID.

Component: 
RecipesList: contains the map method, the same logic used for the two front end pages to show the data to the screen. 

** BACKEND 
Applications used: MySQL for database 

Database Setup
Database table is called saved_meals
The saved_meals table is used to store the favorite meals. Each meal has an id, title, and image.

CREATE TABLE saved_meals (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    title VARCHAR(255) not null, 
    image VARCHAR(255) not null
    );

Run npm migrate to execute the same database 

API Endpoints

POST /api/recipes
Adds a new favorite meal to the saved_meals table.

GET /api/recipes
Retrieves all favorite meals from the saved_meals table.

DELETE /api/recipes/:id
Deletes a favorite meal from the saved_meals table by id.