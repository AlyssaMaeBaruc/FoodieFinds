import React from 'react'
import "./Navbar.css";
import { Link } from 'react-router-dom'

export const Navbar = () => {
  return (
    <nav> 
    <ul>
    <li>
        <Link to ="/">Home </Link>
      </li>
      <li>
        <Link to ="/favourites" className = "saved" > My Saved Meals </Link>
      </li>
    </ul>
  </nav>
  )
}
