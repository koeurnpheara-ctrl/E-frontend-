import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Admin from './pages/Admin.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
