import React from 'react'
import "./Navbar.css";
import { Link, NavLink } from 'react-router-dom'

export const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Foodie<span>Finds</span></Link>
      <ul className="navbar-list">
        <li>
          <NavLink to="/" end className="navbar-link">Home</NavLink>
        </li>
        <li>
          <NavLink to="/this-week" className="navbar-link">This Week</NavLink>
        </li>
        <li>
          <NavLink to="/favourites" className="navbar-link">My Saved Meals</NavLink>
        </li>
      </ul>
    </nav>
  )
}
