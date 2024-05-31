Dependencies
Run npm install in the project folder to install dependencies related to Express (the server).

cd client and run npm install install dependencies related to React (the client).

Database Prep
Create .env file in project directory and add

DB_NAME=todos
DB_PASS=YOUR_PASSWORD
(replace YOUR_PASSWORD with your actual password)

Alternatively, you can rename the provided .env.example file to .env.

Access the mySQL CLI:

MAC: Type mysql -u root -p into your terminal, enter your password when prompted.
WINDOWS: Search for mySQL in windows search and open mySQL 8.0 Command Line Client. Enter you password when prompted.
In the MySQL CLI, type create database todos; to create a database in MySQL.

Run the following in the MySQL CLI: ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YOUR_PASSWORD'; (replace YOUR_PASSWORD with your actual password)

Run npm run migrate in your TERMINAL, in the project folder (not your MySQL CLI! Open a new terminal window for this). This will create a table called 'items' in your database.

Run Your Development Servers
Run npm start in project directory to start the Express server on port 4000
cd client and run npm run dev to start client server in development mode with hot reloading in port 5173.
Client is configured so all API calls will be proxied to port 4000 for a smoother development experience. Yay!
You can test your client app in http://localhost:5173
You can test your API in http://localhost:4000/api
