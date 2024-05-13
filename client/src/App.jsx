import { useState, useEffect } from 'react'
import './App.css'

function App() {

  // this is for the 
  const [ingredients, setIngredients] = useState([""]);
  const [meal, setMealData] = useState('');

  function handleChange(e) {
    setIngredients(e.target.value);
  };

  useEffect(() => {
    fetch('https://api.spoonacular.com/recipes/findByIngredients?apiKey=c5a76b2747564a09b63ee79f924ba472&ingredients=tomato,+potato')
  //then check if my fetch worked 
  .then(response => response.json())
  .then(response => setIngredients(response))
  .catch(error => 
    console.error(error));
//dependencies, run this code when i start the app
  }, []);


  // this is the API
// const api_key = "c5a76b2747564a09b63ee79f924ba472"
  // const options = {
  //   method: 'GET',
  //   headers: {
  //      accept: 'application/json',
  //      'X-RapidAPI-Key': 'c5a76b2747564a09b63ee79f924ba472',
	// 	   'X-RapidAPI-Host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com'
  //   }
  // };
  
  // fetch me the ingredients data 



  return (
    <>
    <h1> Plan your Meal! </h1>
    <form>
    <input type="text" placeholder = "Enter your ingredients" value = {ingredients} onChange = {handleChange} /> 
    <button onClick = {handleSubmit}> Add </button>
    </form>
    
    </>
    
  )
}

export default App
