import './App.css'
import {  Routes , Route } from "react-router-dom";
import FavouriteMeals from "./pages/FavouriteMeals";
import Homepage from "./pages/Homepage";
import { Navbar } from './components/Navbar';

function App () {


  return (
    <>
    <Navbar/>
    {/* creating another page called My Saved Meals */}
    <Routes> 
      <Route path = "/favourites" element = {<FavouriteMeals />} />
      <Route path = "/" element = {<Homepage />} />
     </Routes>
   
    
    </>

  )}
    
export default App
