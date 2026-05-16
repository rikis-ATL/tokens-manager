/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');
const semantic = require('./src/lib/appTheme/tailwind-theme-extend.js');
const {
  getMarketingThemeCssVars,
  getMarketingAutofillStyles,
} = require('./src/lib/marketing-theme.js');

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
  plugins: [
    plugin(({ addBase }) => {
      // Marketing theme — palette names in src/lib/marketing-theme.js (slate-*, sky-*, etc.)
      addBase({
        '[data-marketing="true"]': getMarketingThemeCssVars(),
        ...getMarketingAutofillStyles(),
      });
    }),
  ],
};
