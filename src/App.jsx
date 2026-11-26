import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext.jsx'
import Admin from './pages/Admin.jsx'
import Cart from './pages/Cart.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  )
}
