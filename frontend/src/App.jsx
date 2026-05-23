// App.jsx - Root Application Component
// Handles routing between pages and wraps everything in the Layout.

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EncryptionPage from './pages/EncryptionPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Dashboard / Home page */}
        <Route path="/" element={<Dashboard />} />
        {/* Encryption & Decryption page */}
        <Route path="/encrypt" element={<EncryptionPage />} />
        {/* Analytics & Benchmark page */}
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}

export default App
