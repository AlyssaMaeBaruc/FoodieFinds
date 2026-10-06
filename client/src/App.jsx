import './App.css'
import {  Routes , Route } from "react-router-dom";
import FavouriteMeals from "./pages/FavouriteMeals";
import Homepage from "./pages/Homepage";
import RecipeDetails from "./pages/RecipeDetails";
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
      <Route path = "/recipe/:id" element = {<RecipeDetails />} />
     </Routes>
     <RecipesList />

   
    
    </>

  )}
    
export default App
