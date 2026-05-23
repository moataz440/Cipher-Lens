// Layout.jsx - Shared Page Layout
// Renders the sidebar navigation + main content area.
// All pages are rendered inside the <Outlet /> slot.

import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-bg">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page content with scrolling */}
        <main className="flex-1 overflow-y-auto bg-grid bg-grid-40 p-6">
          {/* Animated page transition wrapper */}
          <div className="animate-fade-up max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
