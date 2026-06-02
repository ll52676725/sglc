/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        gold: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE080',
          300: '#FFD040',
          400: '#E6B820',
          500: '#B8860B',
          600: '#996F09',
          700: '#7A5907',
          800: '#5C4205',
          900: '#3D2C03',
        },
        ivory: '#FFFFF0',
        parchment: '#FFE4C4',
        ink: '#2F4F4F',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
