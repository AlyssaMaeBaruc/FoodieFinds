# Project Title 
Foodie Finds

2. Description: 
This project aims to curate meals tailored to your pantries ingredients.

3. Features:   

Ingredient Input
- Input Field: Users can enter ingredients into a designated input field.
- Add Button: Users can continuously add multiple ingredients.
- Delete Button: Users can remove ingredients from the list by clicking a "Delete" button next to each ingredient.

Meal Suggestions
- Meal Display: When users press "Enter," the system generates and displays meals that can be made using the entered ingredients.

Favorites and Saving
- Add to Favorites: Users can mark meals as favorites for easy access later.
- Save for Later: Users can save meals for future reference, stored in a database or local storage.


4. Installation: 
Run npm install in the project folder to install dependencies related to Express (the server).

cd client and run npm install install dependencies related to React (the client).


5. Database prep: 
Create .env file in project directory and add

DB_NAME=mvp
DB_PASS=YOUR_PASSWORD
(replace YOUR_PASSWORD with your actual password)

Alternatively, you can rename the provided .env.example file to .env.
Run npm run migrate in your terminal in order to create the DB tables.

Access the mySQL CLI:

MAC: Type mysql -u root -p into your terminal, enter your password when prompted.
WINDOWS: Search for mySQL in windows search and open mySQL 8.0 Command Line Client. Enter you password when prompted.
In the MySQL CLI, type create database todos; to create a database in MySQL.


6. Development: 
Run npm start in project directory to start the Express server on port 4000 cd client and run npm run dev to start client server in development mode.
Client is configured so all API calls will be proxied to port 4000 for a smoother development experience. Yay!
You can test your client app in http://localhost:5173
You can test your API in http://localhost:4000


7. Technologies Used
	•	Frontend: React
	•	Backend: Express
	•	Database: MySQL
	•	API: Spoonacular API
	•	Styling: CSS
	•	Testing: Postman
	•	Development: Visual Studio Code