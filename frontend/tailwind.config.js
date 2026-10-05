module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Luxury Private Wealth & Institutional Terminal Palette
        obsidian: {
          bg: "#080A09",         // Main background
          sidebar: "#0C100F",    // Sidebar & header background
          surface: "#111614",    // Primary card/surface
          elevated: "#161C19",   // Elevated surface
          hover: "#1B2420",      // Hover surface
          border: "rgba(255, 255, 255, 0.065)",
          borderHover: "rgba(255, 255, 255, 0.12)",
          borderEmerald: "rgba(21, 149, 112, 0.30)",
          borderGold: "rgba(200, 169, 107, 0.25)"
        },
        ivory: {
          primary: "#F2F0E8",    // Warm off-white primary text
          secondary: "#A7ADA8",  // Refined secondary text
          muted: "#68716C"       // Muted metadata text
        },
        emerald: {
          brand: "#0E6B50",      // Deep emerald brand
          accent: "#159570",     // Secondary emerald
          positive: "#42A77A",   // Financial positive
          muted: "rgba(21, 149, 112, 0.12)"
        },
        gold: {
          champagne: "#C8A96B",  // Luxury champagne accent (<5%)
          muted: "rgba(200, 169, 107, 0.15)",
          border: "rgba(200, 169, 107, 0.25)"
        },
        financial: {
          positive: "#42A77A",   // Muted sophisticated green
          negative: "#C45D62",   // Muted sophisticated red
          warning: "#B89655",    // Muted amber
          neutral: "#7D8782"     // Neutral gray
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
