import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function FavouriteMeals() {

    const [mealList, setMealList] = useState([]);

// const listOfSavedMeals = () => {
//     fetch ("/api/recipes")
//     .then(response => {
//         if (!response.ok) {
//           throw new Error({message: "Failed"});
//         }
//         return response.json();
//       })
//       .catch(error => {
//         console.error({message: "Error found:", error});
//         throw error; // show it to the user 
//       });
//   };

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
   <div classname = "container"> </div>
    {mealList.map (( meal,index) => (
    <ul key = {index}> 
    <div> 
      <h3> {meal.title} </h3> 
      </div>
     <img src = {meal.image}  />
    
    </ul>
    ))}

      
    </>

    )
}

export default FavouriteMeals
