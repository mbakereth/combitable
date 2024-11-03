const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        neutral: colors.neutral,
      }
    },
  },
  plugins: [require('daisyui')],
}

