import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext.jsx'

export default function SiteHeader() {
  const { itemCount } = useCart()

  return (
    <>
      <div className="announcement">
        <span>Thoughtful goods, made for everyday living</span>
        <span className="announcement-note">Cash on delivery across Cambodia</span>
      </div>
      <header className="site-header">
        <nav className="navbar navbar-expand-lg container site-nav" aria-label="Main navigation">
          <Link className="navbar-brand brand" to="/" aria-label="Form and Field home">
            <span className="brand-mark" aria-hidden="true">f.</span>
            <span>form <span className="brand-amp">&</span> field</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavigation"
            aria-controls="mainNavigation"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNavigation">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item"><a className="nav-link" href="/#shop">Shop all</a></li>
              <li className="nav-item"><a className="nav-link" href="/#categories">Collections</a></li>
              <li className="nav-item"><a className="nav-link" href="/#story">Our story</a></li>
            </ul>
            <Link className="nav-action cart-nav-action" to="/cart" aria-label={`Shopping bag, ${itemCount} items`}>
              <i className="bi bi-bag" aria-hidden="true" />
              <span>Bag</span>
              <span className="cart-count" aria-live="polite">{itemCount}</span>
            </Link>
          </div>
        </nav>
      </header>
    </>
  )
}
