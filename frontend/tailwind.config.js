/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk dark palette
        cyber: {
          bg:      '#050a18',
          surface: '#0d1424',
          card:    '#111827',
          border:  '#1e2d4a',
          cyan:    '#00e5ff',
          blue:    '#2563eb',
          purple:  '#8b5cf6',
          green:   '#10b981',
          yellow:  '#f59e0b',
          red:     '#ef4444',
          text:    '#e2e8f0',
          muted:   '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'scan-line':  'scanLine 3s linear infinite',
        'fade-up':    'fadeUp 0.5s ease-out',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%':   { textShadow: '0 0 4px #00e5ff, 0 0 10px #00e5ff' },
          '100%': { textShadow: '0 0 8px #00e5ff, 0 0 20px #00e5ff, 0 0 40px #00e5ff' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'cyber-grid': `
          linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
      boxShadow: {
        'glow-cyan':   '0 0 20px rgba(0, 229, 255, 0.3)',
        'glow-blue':   '0 0 20px rgba(37, 99, 235, 0.4)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-green':  '0 0 20px rgba(16, 185, 129, 0.3)',
        'card':        '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
