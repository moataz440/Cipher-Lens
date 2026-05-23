// TopBar.jsx - Top navigation bar
// Shows current page title, status indicator, and hamburger menu.

import React from 'react'
import { Menu, Clock } from 'lucide-react'

function TopBar({ onMenuClick }) {

  // Live clock
  const [time, setTime] = React.useState(new Date())
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="px-6 py-3 bg-cyber-surface/80 backdrop-blur-sm border-b border-cyber-border shrink-0">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        {/* Left: hamburger */}
        <div className="flex items-center">
          <button
            id="hamburger-menu"
            onClick={onMenuClick}
            className="p-2 rounded-lg text-cyber-muted hover:text-cyber-cyan
              hover:bg-cyber-border/40 transition-all duration-200"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Right: status + clock */}
        <div className="flex items-center gap-5">

          {/* Live clock */}
          <div className="flex items-center gap-2 text-xs text-cyber-muted terminal-text">
            <Clock size={13} />
            <span>
              {time.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar
