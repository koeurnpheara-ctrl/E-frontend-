import React from 'react'

export default function SiteHeader() {
  return (
    <>
      <div className="announcement">
        <span>Thoughtful goods, made for everyday living</span>
        <span className="announcement-note">Complimentary delivery on orders over $75</span>
      </div>
      <header className="site-header">
        <nav className="navbar navbar-expand-lg container site-nav" aria-label="Main navigation">
          <a className="navbar-brand brand" href="/" aria-label="Form and Field home">
            <span className="brand-mark" aria-hidden="true">f.</span>
            <span>form <span className="brand-amp">&</span> field</span>
          </a>
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
              <li className="nav-item"><a className="nav-link" href="#shop">Shop all</a></li>
              <li className="nav-item"><a className="nav-link" href="#categories">Collections</a></li>
              <li className="nav-item"><a className="nav-link" href="#story">Our story</a></li>
            </ul>
            <a className="nav-action" href="#shop" aria-label="Browse the shop">
              <i className="bi bi-bag" aria-hidden="true" />
              <span className="nav-action-label">Shop</span>
            </a>
          </div>
        </nav>
      </header>
    </>
  )
}
