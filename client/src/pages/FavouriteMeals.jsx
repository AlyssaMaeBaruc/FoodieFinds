import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function FavouriteMeals() {

    const [mealList, setMealList] = useState([]);

  const listOfSavedMeals = () => {
fetch("/api/recipes")
  .then((res) => res.json())
  .then((data) => {
    // upon success, update tasks
    console.log(data);
    setMealList(data);
  })
  .catch((error) => {
    // upon failure, show error message
  });
}

      //so for this page, it should be updated once it loads, once a user favourites a new meal. then it should appear 
      useEffect (() => {
        listOfSavedMeals();
      }, []);



      return (
        <>
          <div >
            {mealList.map((meal, index) => (
              <div className="container" key={index}>
                <h3>{meal.title}</h3>
                  <li >
                    <img src={meal.image} alt={meal.title} />
                  </li>
              </div>
            ))}
          </div>
        </>
      );
    }
      
export default FavouriteMeals
