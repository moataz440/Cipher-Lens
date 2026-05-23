// Sidebar.jsx - Navigation Sidebar
// Provides links to all pages with active state highlighting
// and animated hover effects.

import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Lock,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Navigation items configuration
const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Info',
  },
  {
    path: '/encrypt',
    label: 'Encrypt / Decrypt',
    icon: Lock,
    description: 'XOR & AES Tools',
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Benchmark & Stats',
  },
]

function Sidebar({ isOpen, onToggle }) {
  return (
    <aside
      className={`
        relative flex flex-col
        bg-cyber-surface border-r border-cyber-border
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        shrink-0 z-20
      `}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-cyber-border">
        {/* Animated shield icon */}
        <div className="relative shrink-0 w-9 h-9">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan opacity-20 animate-pulse" />
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-cyber-cyan/30">
            <Shield size={20} className="text-cyber-cyan" />
          </div>
        </div>

        {/* Brand name — hidden when sidebar is collapsed */}
        {isOpen && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-glow text-cyber-cyan leading-tight">
              CipherLens
            </h1>
            <p className="text-xs text-cyber-muted leading-tight">Image Encryption</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ path, label, icon: Icon, description }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-lg
              transition-all duration-200 group relative
              ${isActive
                ? 'bg-cyber-blue/20 border border-cyber-cyan/20 text-cyber-cyan'
                : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-border/40 border border-transparent'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyber-cyan rounded-r-full shadow-[0_0_8px_#00e5ff]" />
                )}

                <Icon
                  size={20}
                  className={`shrink-0 transition-all duration-200 ${
                    isActive ? 'text-cyber-cyan' : 'text-cyber-muted group-hover:text-cyber-cyan'
                  }`}
                />

                {isOpen && (
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium leading-tight">{label}</div>
                    <div className="text-xs text-cyber-muted leading-tight">{description}</div>
                  </div>
                )}

                {/* Tooltip when sidebar is collapsed */}
                {!isOpen && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-cyber-card border border-cyber-border rounded-lg
                    text-sm whitespace-nowrap text-cyber-text opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 z-50 shadow-xl">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-cyber-muted">{description}</div>
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        id="sidebar-toggle"
        className="flex items-center justify-center gap-2 m-3 py-2 px-3
          rounded-lg border border-cyber-border text-cyber-muted
          hover:text-cyber-cyan hover:border-cyber-cyan/30
          transition-all duration-200 text-sm"
      >
        {isOpen ? (
          <>
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </>
        ) : (
          <ChevronRight size={16} />
        )}
      </button>

      {/* Version badge */}
      {isOpen && (
        <div className="px-4 pb-4 text-center">
          <span className="text-xs text-cyber-muted terminal-text">v1.0.0 · AES-256 + XOR</span>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
