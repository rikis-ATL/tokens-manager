/** @type {import('tailwindcss').Config} */
const semantic = require('./src/lib/appTheme/tailwind-theme-extend.js');

module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: semantic,
  },
  plugins: [],
};
