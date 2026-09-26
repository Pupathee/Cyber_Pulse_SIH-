/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:        '#050b14',
          card:      '#0a1628',
          cardHover: '#0e1e38',
          border:    'rgba(0,245,212,0.18)',
          cyan:      '#00f5d4',
          blue:      '#008cff',
          green:     '#00ff9d',
          orange:    '#ff9100',
          red:       '#ff2d41',
          muted:     '#7d99aa',
          text:      '#e8f7ff',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cyan:   '0 0 24px rgba(0,245,212,0.15)',
        blue:   '0 0 24px rgba(0,140,255,0.15)',
        green:  '0 0 24px rgba(0,255,157,0.15)',
        red:    '0 0 24px rgba(255,45,65,0.20)',
        orange: '0 0 24px rgba(255,145,0,0.20)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan':        'scan 4s linear infinite',
        'blink':       'blink 1.2s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
