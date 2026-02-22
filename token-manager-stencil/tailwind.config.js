/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
    './src/**/*.tsx',
    '../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/**/*.{js,ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}