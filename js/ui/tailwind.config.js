module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        "primary": "var(--color-primary)",
        "dark-grey": "var(--color-dark-grey)",
        "epic": "#7b54ff",
        "legendary": "#ffd436",
        "uncommon": "#64ff43",
        "rare": "#ff3636",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
