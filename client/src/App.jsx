import './App.css'
import {  Routes , Route } from "react-router-dom";
import FavouriteMeals from "./pages/FavouriteMeals";
import Homepage from "./pages/Homepage";
import RecipeDetails from "./pages/RecipeDetails";
import ThisWeek from "./pages/ThisWeek";
import ShoppingList from "./pages/ShoppingList";
import Pantry from "./pages/Pantry";
import MyRecipe from "./pages/MyRecipe";
import { Navbar } from "./components/Navbar";
import RecipesList from './components/RecipesList';


function App () {


  return (
    <>
    <Navbar/>
    {/* creating another page called My Saved Meals */}
    <Routes> 
      <Route path = "/favourites" element = {<FavouriteMeals />} />
      <Route path = "/" element = {<Homepage />} />
      <Route path = "/this-week" element = {<ThisWeek />} />
      <Route path = "/shopping-list" element = {<ShoppingList />} />
      <Route path = "/pantry" element = {<Pantry />} />
      <Route path = "/my-recipe/:id" element = {<MyRecipe />} />
      <Route path = "/recipe/:id" element = {<RecipeDetails />} />
     </Routes>
     <RecipesList />

   
    
    </>

  )}
    
export default App
