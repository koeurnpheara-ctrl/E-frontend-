import React from 'react'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <a className="brand footer-brand" href="/" aria-label="Form and Field home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          <span>form <span className="brand-amp">&</span> field</span>
        </a>
        <p>Considered essentials for a life well lived.</p>
        <span className="footer-copy">© {new Date().getFullYear()} Form & Field</span>
      </div>
    </footer>
  )
}
