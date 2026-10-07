import React from 'react'
import "./Navbar.css";
import { Link, NavLink } from 'react-router-dom'
import Icon from './Icon'

// the four sections; on phones they become a bottom tab bar with icons
const TABS = [
  { to: "/", label: "This Week", icon: "calendar", end: true },
  { to: "/shopping-list", label: "Shopping", icon: "cart" },
  { to: "/pantry", label: "Pantry", icon: "fridge" },
  { to: "/library", label: "Library", icon: "book" },
];

export const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-mark"><Icon name="chefHat" size={18} /></span>
        <span>Foodie<span className="brand-accent">Finds</span></span>
      </Link>
      <ul className="navbar-list">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} end={tab.end} className="navbar-link">
              <Icon name={tab.icon} size={22} className="navbar-icon" />
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
