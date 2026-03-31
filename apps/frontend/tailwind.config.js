// apps/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F3EE',
        foreground: '#1A1A1A',
        teal: {
          DEFAULT: '#0D6E6E',
          light: '#0D6E6E1A',
        },
        error: '#B91C1C',
        warning: '#B45309',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Serif 4', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0',
        none: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
    },
  },
  plugins: [],
};
