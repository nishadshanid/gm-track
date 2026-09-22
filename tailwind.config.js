/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The accent is per-person and set at runtime as CSS custom properties
        // on the shell (see Layout), so components never hardcode a colour.
        accent: {
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
        },
        success: '#22c55e',
        warning: '#f97316',
        danger: '#ef4444',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgb(0 0 0 / 0.08)',
        'soft-dark': '0 4px 20px -2px rgb(0 0 0 / 0.4)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
}
