import React from 'react'
import "./Navbar.css";
import { Link } from 'react-router-dom'

export const Navbar = () => {
  return (
    <nav> 
    <ul className= "navbar-list" >
    <li className= "navbar-item">
        <Link to ="/">Home </Link>
      </li>
      <li className= "navbar-item">
        <Link to ="/favourites" className = "saved" > My Saved Meals </Link>
      </li>
    </ul>
  </nav>
  )
}
