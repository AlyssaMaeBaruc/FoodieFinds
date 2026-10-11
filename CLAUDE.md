# FoodieFinds

A **weekly meal prep planner**. Save recipes (from Spoonacular, any recipe website, TikTok, or typed by hand), plan lunch and dinner for each day of the week, get one merged shopping list, and keep track of what's in the pantry. The goal is to make weekly planning quick and keep the shopping list short: suggestions favour meals that share ingredients, use what's already at home, and are healthier.

## Working with the owner

- The owner is a **beginner**. Explain things in plain words, avoid jargon, and say what each change means for them.
- **Show a plan before writing code** for any new feature, and wait for "go". Don't edit files (or run commands that change things) before the plan is approved. Small fixes the owner directly asks for ("make X more visible") can be done straight away.
- **Spoonacular API points matter** (free plan: 150/day, check the `x-api-quota-*` response headers). Say what a feature or test will cost before spending points, prefer cached data, and keep tests cheap.
- **Test before reporting done**: call the API with curl, and check the UI with headless Chrome screenshots (desktop 1280px and phone 390px) via the DevTools protocol (`--remote-debugging-port`, `node --experimental-websocket`). Put scripts and screenshots in the session scratchpad, not the repo.
- **Clean up test data** afterwards (test pantry items, saved test recipes, ticks). The owner uses the app while you work: before deleting anything, check timestamps (`added_at`) so only your own test rows are removed.
- **Commit only when asked.** Messages: short title, plain-English body, ending with the `Co-Authored-By` line. Use `git commit -F -` with a heredoc. Use `git mv` when moving files. The owner pushes from VS Code (Cmd+Shift+P → "Git: Push").
- The owner runs migrations themselves with `mysql -u root -p mvp < model/migrations/0XX_….sql` (it prints nothing on success). A session can also run one through node with `model/helper.js`. A single `CREATE TABLE` makes the helper report "Action not complete" even when it worked, so check with `SHOW TABLES`.

## Design

All UI work follows **`DESIGN.md`** (repo root). Use the `--ff-` variables from `client/src/styles/tokens.css`; don't hard-code colours, fonts, spacing, radii or shadows. Current look: dark colours (Espresso, Cocoa, Copper) for text only, light Cream/Tan/peach gradients for surfaces, borderless headers on a glowing page, glass cards without border lines, pill buttons with a light peach gradient, and slow amber/copper blobs that drift and move with scrolling (all off with reduced motion). Sentence case everywhere, 44px touch targets, no horizontal scroll at 375/768/1280px. The owner changed direction several times: ask before big visual changes, and show screenshots.

## Tech stack and running it

- **Server:** Node + Express (`app.js`, `bin/www`), port **4000**. MySQL through `mysql2` (`model/helper.js`). Start with `npm start` (nodemon) in the project root.
- **Client:** React 18 + Vite + react-router 6 in `client/`, port **5173**. Start with `cd client && npm run dev`. Vite proxies `/api` to port 4000.
- **Recipes:** Spoonacular API, **only called from the server** (the key lives in `.env`, never in the client). Calls go through `model/spoonacular.js` (20s timeout, a 402 becomes a "daily limit" message).
- **`.env`** (project root, not in git): `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` (mvp), `SPOONACULAR_API_KEY`.
- **⚠ `npm run migrate` runs `model/init_db.sql`, which DROPS ALL TABLES and wipes all data.** Only use it for a brand-new database. For an existing one, run the numbered files in `model/migrations/` (001–011, all applied to the owner's database). Keep `init_db.sql` in step with every new migration.

## Where things live

**Client pages** (`client/src/pages/`)
- `ThisWeek.jsx`: landing page at `/`. Greeting header, Today card, chips, "Find a meal" search (`components/MealSearch.jsx`), week grid, Fill my week preview, week mix and Weekly rules.
- `ShoppingList.jsx`: `/shopping-list`. Aisles, ticking, basket, Already have, pantry basics, Share/Copy.
- `Pantry.jsx`: `/pantry`. Search to add, Fridge/Freezer/Cupboard cards, plus `WhatCanIMake`.
- `Library.jsx`: `/library`, with `?view=find` for search. Wraps `components/MyMeals.jsx` (saved meals) and `components/FindRecipes.jsx` (ingredient and cuisine search).
- `RecipeDetails.jsx` (`/recipe/:id`, Spoonacular) and `MyRecipe.jsx` (`/my-recipe/:id`, custom recipes; embeds the TikTok video when the source is TikTok).
- `App.jsx` holds the routes. `/this-week` and `/favourites` redirect to `/` and `/library`.

**Client components:** `Navbar` (top bar on desktop, bottom tab bar with icons at 760px and narrower), `RecipeCard` and `RecipesList`, `MealChooser`, `AddToWeekPicker`, `AddRecipeDialog`, `TagEditor`, `GradeBadge` and `GradePicker`, `WeekNav` (the `?week=` param), `WhatCanIMake`, `Icon` (inline SVG icons, no emoji in the UI). Styles: `client/src/App.css` and `index.css` (colour tokens, including `--grade-a`…`--grade-e`).

**Server routes** (`routes/`)
- `recipes.js`: `/api/recipes`. Saved meals, with tags, health grades and `ingredient_names` added on load; `POST` returns the saved id (409 too); `PUT /:id/tags`, `PUT /:id/grade`; `GET /search` (Spoonacular complexSearch) and `GET /info/:id` (recipe page), both cached in `model/recipeSearch.js`.
- `mealPlan.js`: `/api/meal-plan`. Week plan, add and remove, `/suggest` (Fill my week), `/bulk`.
- `shoppingList.js`: `/api/shopping-list`. Generate, tick, buy anyway; syncs ticks with the pantry.
- `customRecipes.js`: `/api/custom-recipes`. Extract from a link (TikTok via oEmbed), parse lines, save.
- `pantry.js`: `/api/pantry`, plus `/search`, `/suggestions`, `/ideas`.
- `tags.js` and `weeklyRules.js`. Saved TikTok photos are served at `/api/images` (from `uploads/`, git-ignored).

**Rule files (pure functions, "Tuning" blocks meant to be edited):**
- `model/fillWeek.js`: Fill my week scoring.
- `model/shoppingList.js`: shopping names, aliases, splits.
- `model/pantryBasics.js`: salt, oil and other basics.
- `model/tagRules.js`: tag suggestions.
- `model/healthGrade.js`: score to grade bands.
- `model/pantryMatch.js`: pantry locations and list matching.
- `model/pantrySuggest.js`: What can I make scoring.
- `model/tiktokCaption.js`: caption reading.
- `model/translateIngredient.js` with `spanishDictionary.js`: Spanish to English.

**Caches (to save API points):**
- `cached_recipes` and `cached_recipe_ingredients`: ingredients, minutes and health score per Spoonacular recipe.
- `ingredient_search_cache`: pantry searches.
- `pantry_ideas_cache`: findByIngredients results, per pantry.
- `recipe_search_cache` (7 days) and `recipe_info_cache` (30 days): recipe searches and recipe pages, so the same search or page again is free.

## Features done (newest first)

- **Design system and new look:** DESIGN.md + tokens.css; light gradients with dark text, moving blobs, mouse glow, borderless headers. Health grades on This Week folded into a chip.
- **Search while planning:** a "Find a meal" box on This Week searches your library by name, tag or ingredient (free, as you type) and, on a button press, Spoonacular (~1 point, cached). Any result can be planned with Add to week; new recipes are saved to the library first. The "+ Add" pop-up has My meals (same library search) and Find new recipe tabs. All Spoonacular calls moved to the server and recipe pages are cached.
- **Navigation:** 4 tabs: This Week (landing `/`), Shopping, Pantry, Library. A bottom tab bar on phones. A homey header: greeting, a title for each week, "X of 14 meals planned", a Today card, and chips for "left to buy" and "to use soon".
- **What can I make?** (Pantry page)
  - Saved meals you can make now, and ones missing 1–2 ingredients.
  - New ideas from Spoonacular's `findByIngredients`, only on a "Find new ideas" press, saved per pantry, with a ♥ to save.
  - "Use soon" items count 3×.
  - Fill my week boosts meals that use pantry items (more for "Use soon", once per item per week).
- **Pantry**
  - Fridge/Freezer/Cupboard cards with icons and colours; Use soon; Move (⟷); remove.
  - Search shows your own ingredients first, then Spoonacular autocomplete (cached). Stores the Spoonacular ingredient id.
  - Shopping List gets an "Already have" section with "Buy anyway". Ticking bought adds to the pantry; unticking undoes it if that tick added it.
- **TikTok links in Add recipe**
  - oEmbed gives the caption, which is turned into a title, ingredients and steps.
  - The photo is copied into `uploads/` because TikTok photo links expire.
  - No ingredients in the caption: the manual form opens pre-filled.
  - The video is embedded on the recipe page.
- **Health grades A–E**
  - From Spoonacular `healthScore`, cached. Custom recipes are scored with `/recipes/analyze` (~1.5 points, once).
  - The badge sits next to the title. Override by tapping it on My meals.
  - Weekly rule: "at least X meals graded A or B", which Fill my week enforces. The week mix shows on This Week.
- **Tags** on saved meals: 10 defaults plus your own, suggested once from ingredients, then editable.
- **Share the shopping list:** Share (phone share menu, or WhatsApp on desktop) and Copy. Only unbought items, without the pantry section.
- **Fill my week**
  - Suggests saved meals for empty slots from today onwards, favouring shared ingredients.
  - Repeats are allowed as leftovers, never on the same day.
  - Preview with shuffle per slot, then Keep these / Cancel. 0 points using the ingredient cache.
- **Earlier:**
  - Custom recipes: from any link (Spoonacular extract) or by hand, with a review step and a Spanish dictionary that learns new words.
  - Select mode to bulk-delete saved meals.
  - Cuisine search.
  - Shopping list: no amounts, names merged, aisles, basket, bulk tick, grouped by recipe.
  - Meal planner, recipe pages, favourites, and the frosted-glass brown and orange design.

## Important decisions

- **One meal per slot** (lunch and dinner), **Monday to Sunday** weeks. Dates are plain `"YYYY-MM-DD"` strings, and the selected week is in `?week=`. Planned meals are never touched by suggestions.
- **No quantities** anywhere: the shopping list and the pantry are names only. One line per shopping name (`"feta cheese"` becomes `"Feta"`), matched by name, not by Spoonacular id, because one line can merge several ids.
- **Pantry basics** (salt, pepper, oil and so on) are separate. They're ignored when comparing recipes or deciding what you can make.
- **Pork is tagged separately** from beef. Bacon, ham, chorizo and sausage count as pork. A meal can have several tags. "Veggie" means no meat or fish at all. Stock, broth and sauces don't give a meat tag but do rule out veggie. Tags are suggested once (`tags_suggested`), so edits are never overwritten.
- **Health grade A–E** from `healthScore`: 80+ A, 60+ B, 40+ C, 20+ D, below 20 E. A grade you set yourself always wins. Spoonacular scores are harsh (most of the owner's meals are E); making the bands kinder is an open question.
- **Fill my week** may repeat meals (to save points and food), at most twice a week and never on the same day. It nudges towards higher grades, pantry and "Use soon" items, and away from last week's meals.
- **Spend as few points as possible:** cache whatever Spoonacular returns. Things that cost points (ideas, new searches) only run on a button press. Show the cost on buttons where it matters.
- The **grade badge sits next to the title**, not on the photo, so it's always readable.

## Known issues

- **The old Spoonacular API key is still in git history** (it used to be in `client/src/spoonacular.js`, now deleted). The owner should create a new key on Spoonacular, put it in `.env`, and stop using the old one.
- Deleting a TikTok recipe leaves its photo in `uploads/` (harmless, about 270 KB each).
- On 7 Oct, 18 ticked items on that week's shopping list were found unticked. The cause is unknown and the owner was asked about it.

## What's next (offered, not started)

1. Rotate the Spoonacular API key (see Known issues).
2. Pantry ideas refresh: fetch 30, add a free "Show more ideas", and a "Try different ideas" button (~1 point, varies the starting ingredients and skips ideas already seen).
3. "Add from my pantry" button in Find new recipes.
4. Kinder health-grade bands.
5. Update `README.md` (it doesn't cover Share, Tags, Grades, TikTok, Pantry or the new navigation).
6. An end-to-end test of the Add recipe flow from a link (about 10 points).
