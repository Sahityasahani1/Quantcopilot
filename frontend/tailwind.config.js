module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#05070a",
          card: "#0d1117",
          border: "#161b22",
          accent: "#38bdf8",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b"
        }
      }
    }
  },
  plugins: []
};
