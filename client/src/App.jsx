import { useState } from 'react'
import './App.css'
import {  Routes , Route } from "react-router-dom";
import { Link } from 'react-router-dom';
import FavouriteMeals from "./pages/FavouriteMeals";
import Homepage from "./pages/Homepage";

function App () {

  return (
    <>
    <nav> 
      <ul>
      <li>
          <Link to ="/">Home </Link>
        </li>
        <li>
          <Link to ="/favourites"> My Saved Meals </Link>
        </li>
      </ul>
    </nav>
    {/* creating another page called My Saved Meals */}
    <Routes> 
      <Route path = "/favourites" element = {<FavouriteMeals />} />
      <Route path = "/" element = {<Homepage />} />
     </Routes>
   
    
    </>

  )}
    
export default App
