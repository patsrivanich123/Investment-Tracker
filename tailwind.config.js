/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0a0f1e',
          card: '#111827',
          border: '#1f2937',
          muted: '#374151',
        },
        dime: { DEFAULT: '#3b82f6', dim: '#1d4ed880' },
        ibkr: { DEFAULT: '#8b5cf6', dim: '#6d28d980' },
        aiquant: { DEFAULT: '#14b8a6', dim: '#0d948380' },
        goal: { DEFAULT: '#f59e0b', dim: '#b4530980' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Cascadia Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        glow: '0 0 20px -5px',
      },
    },
  },
  plugins: [],
}
