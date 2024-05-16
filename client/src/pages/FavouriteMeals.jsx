import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function FavouriteMeals() {

    const [mealList, setMealList] = useState([]);

const listOfSavedMeals = (title , image) => {
    fetch ("/api/recipes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    })
    .then(response => {
        if (!response.ok) {
          throw new Error({message: "Failed"});
        }
        return response.json();
      })
      .catch(error => {
        console.error({message: "Error found:", error});
        throw error; // show it to the user 
      });
  };

      //so for this page, it should be updated once it loads, once a user favourites a new meal. then it should appear 
      useEffect (() => {
        listOfSavedMeals();
      }, []);



    return (
    <>
    My Saved Meals

    {mealList.map (( meal,index) => (
    <ul key = {index}> {meal.title} 
    
    </ul>
    ))}

      
    </>

    )
}

export default FavouriteMeals
