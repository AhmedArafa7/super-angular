/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'surface': 'var(--surface)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-container-high': 'var(--surface-container-high)',
        'surface-container-highest': 'var(--surface-container-highest)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'error': 'var(--error)',
        'on-error': 'var(--on-error)',
      }
    },
  },
  plugins: [],
}

