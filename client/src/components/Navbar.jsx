import React from 'react'
import "./Navbar.css";
import { Link, NavLink } from 'react-router-dom'
import Icon from './Icon'

export const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-mark"><Icon name="chefHat" size={18} /></span>
        <span>Foodie<span className="brand-accent">Finds</span></span>
      </Link>
      <ul className="navbar-list">
        <li>
          <NavLink to="/" end className="navbar-link">Home</NavLink>
        </li>
        <li>
          <NavLink to="/this-week" className="navbar-link">This Week</NavLink>
        </li>
        <li>
          <NavLink to="/shopping-list" className="navbar-link">
            <span className="label-long">Shopping List</span><span className="label-short">Shopping</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/favourites" className="navbar-link">
            <span className="label-long">My Saved Meals</span><span className="label-short">Saved</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
