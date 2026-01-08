/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'sl-purple': '#31135d',
        'sl-purple-light': '#4a2f7c',
      },
    },
  },
  plugins: [],
}

