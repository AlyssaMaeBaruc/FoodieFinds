import './App.css'
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Library from "./pages/Library";
import RecipeDetails from "./pages/RecipeDetails";
import ThisWeek from "./pages/ThisWeek";
import ShoppingList from "./pages/ShoppingList";
import Pantry from "./pages/Pantry";
import MyRecipe from "./pages/MyRecipe";
import { Navbar } from "./components/Navbar";

// old addresses keep working: /this-week?week=… -> /?week=…, /favourites -> /library
function MovedTo({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

function App () {
  return (
    <>
    <Navbar/>
    <Routes>
      <Route path="/" element={<ThisWeek />} />
      <Route path="/shopping-list" element={<ShoppingList />} />
      <Route path="/pantry" element={<Pantry />} />
      <Route path="/library" element={<Library />} />
      <Route path="/my-recipe/:id" element={<MyRecipe />} />
      <Route path="/recipe/:id" element={<RecipeDetails />} />

      <Route path="/this-week" element={<MovedTo to="/" />} />
      <Route path="/favourites" element={<MovedTo to="/library" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )}

export default App
