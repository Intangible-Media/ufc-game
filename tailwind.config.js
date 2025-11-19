/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ufcHead: ["UFCSansCondensedBold", "sans-serif"],
        ufcBody: ["UFCSansRegular", "sans-serif"],
      },
    },
  },
  plugins: [],
};
