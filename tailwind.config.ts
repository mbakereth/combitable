const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        neutral: colors.neutral,
        "required": "var(--required)",
      }
    },
  },
    daisyui: {
      themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          //...require("daisyui/src/theming/themes")["corporate"],
            "--required": "#a5a8c4",
          },
        dark: {
            ...require("daisyui/src/theming/themes")["dark"],
            "--required": "#282c42",
        },
      },
    ],
  },
  plugins: [require('daisyui')],
}

