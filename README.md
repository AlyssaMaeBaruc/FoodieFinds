# 🍽️ FoodieFinds

**Find meals with the ingredients you already have.**

FoodieFinds turns what's in your pantry into meal ideas. Add the ingredients you have, hit **Find Recipes**, and browse dishes you can make, then heart the ones you love to keep them in your saved meals.

---

## ✨ Features

### Ingredient search

- **Add ingredients:** type an ingredient and press **Add** (or Enter). Blank entries are ignored.
- **Ingredient tags:** each ingredient appears as a tag with its own ✖️ to remove it.
- **Find Recipes:** searches for meals that use your ingredients, powered by the [Spoonacular API](https://spoonacular.com/food-api/docs#Search-Recipes-by-Ingredients).
- **Clear errors:** a message appears if no recipes match or the search fails.

### Recipe cards

- Recipes appear in a responsive grid of frosted-glass cards, each with a photo and title.
- Cards lift slightly when you hover over them.

### Favourites

- **Heart to save:** tap the heart on a recipe photo to save it. The heart fills orange to confirm, and a saved meal can't be added twice by accident.
- **My Saved Meals:** a separate page lists every meal you've saved. Saved meals are stored in a MySQL database.
- **Delete:** remove a meal from your saved list at any time.

### Design

- Modern frosted-glass look over a full-screen food photo.
- Warm palette: dark brown text with orange accents, using the Plus Jakarta Sans font.
- A frosted navigation bar that stays at the top of the page, highlighting the page you're on.
- Layout adapts to phone, tablet and desktop screens.

---

## 🛠️ Tech stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Frontend | React 18, React Router, Vite              |
| Backend  | Node.js, Express                          |
| Database | MySQL 8+ (via the `mysql2` driver)        |
| Recipes  | Spoonacular API                           |
| Styling  | Plain CSS with shared color variables     |

---

## 📁 Project structure

```text
FoodieFinds/
├── app.js                  # Express app setup
├── bin/www                 # Starts the server on port 4000
├── routes/recipes.js       # Saved-meals API (GET, POST, DELETE)
├── model/
│   ├── helper.js           # Runs database queries
│   ├── database.js         # Migration script (creates tables)
│   └── init_db.sql         # Table definitions
└── client/                 # React frontend
    └── src/
        ├── App.jsx                     # Routes
        ├── components/Navbar.jsx       # Top navigation bar
        ├── components/RecipesList.jsx  # Recipe card grid + heart button
        ├── pages/Homepage.jsx          # Ingredient search
        └── pages/FavouriteMeals.jsx    # Saved meals page
```

---

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [MySQL](https://dev.mysql.com/downloads/) 8 or newer

### 1. Install dependencies

```bash
# in the project folder (server)
npm install

# then the client
cd client
npm install
```

### 2. Create the database

Open the MySQL command line and create the `mvp` database:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE mvp;
```

### 3. Add your database details

Create a file called `.env` in the main project folder:

```text
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=YOUR_MYSQL_PASSWORD
DB_NAME=mvp
```

Replace `YOUR_MYSQL_PASSWORD` with your real MySQL password. `.env` is git-ignored, so your password stays private.

### 4. Create the tables

```bash
npm run migrate
```

> ⚠️ This drops and recreates the `saved_meals` table, so running it again deletes any saved meals.

### 5. Run the app

In one terminal, start the server (port 4000):

```bash
npm start
```

In a second terminal, start the client:

```bash
cd client
npm run dev
```

Open **<http://localhost:5173>** in your browser. API calls from the client are automatically forwarded to the server on port 4000.

---

## 🔌 API

All routes are under `/api/recipes`.

| Method | Route              | Description            | Body                  |
| ------ | ------------------ | ---------------------- | --------------------- |
| GET    | `/api/recipes`     | List all saved meals   | none                  |
| POST   | `/api/recipes`     | Save a meal            | `{ "title", "image" }` |
| DELETE | `/api/recipes/:id` | Delete a saved meal    | none                  |

### Database table: `saved_meals`

| Column | Type         | Notes                    |
| ------ | ------------ | ------------------------ |
| id     | INT          | Primary key, auto-increment |
| title  | VARCHAR(255) | Recipe name              |
| image  | VARCHAR(255) | Recipe image URL         |

---

## 🧯 Troubleshooting

| Problem | Fix |
| ------- | --- |
| **"Failed to save meal"** | Make sure the server is running (`npm start`) and your `.env` details are correct. |
| **`Access denied for user 'root'`** | The password in `.env` is wrong or the file isn't saved. Restart the server after changing `.env`. |
| **`Table 'mvp.saved_meals' doesn't exist`** | Run `npm run migrate`. |
| **`Unknown database 'mvp'`** | Create it with `CREATE DATABASE mvp;` in MySQL. |

---

## 🌱 Future ideas

- Show hearts as already filled for meals you saved before.
- Recipe detail view with instructions and missing ingredients.
- User accounts so everyone has their own saved meals.
