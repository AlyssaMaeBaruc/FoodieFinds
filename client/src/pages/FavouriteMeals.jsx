import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RecipesList from '../components/RecipesList'; 


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
    console.error("Error", error);
  });
}

      //so for this page, it should be updated once it loads, once a user favourites a new meal. then it should appear 
      useEffect (() => {
        listOfSavedMeals();
      }, []);


      const deleteSavedMeal = (id) => {
        fetch(`/api/recipes/${id}`, {
          method: "DELETE"
        })
        .then((res) => {
          if (res.ok) {
            // Remove the deleted meal from the mealList
            setMealList(mealList.filter((meal) => meal.id !== id));
          } else {
            throw new Error("Failed to delete meal");
          }
        })
        .catch((error) => {
          console.error("Error deleting meal:", error);
        });
      }

      return (
        <>
        <p> Here, you'll find all your favorite dishes waiting for you. Happy Cooking! 😊</p>
          {/* <div >
            {mealList.map((meal, index) => (
              <div className="container" key={index}>
                <h3>{meal.title}</h3>
                  <li >
                    <img src={meal.image} alt={meal.title} />
                  </li>
              </div>
            ))}
          </div> */}
            <RecipesList recipes={mealList} showSaveButton={false} deleteMeal={deleteSavedMeal} />
        </>
      );
    }
      
export default FavouriteMeals
