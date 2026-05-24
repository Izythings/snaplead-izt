import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0E10",
        slate: "#3F3F46",
        muted: "#71717A",
        paper: "#FAFAF7",
        cream: "#F4F4F0",
        brick: "#E2503E",
        good: "#15803D",
        dark: "#0E0E10",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        editorial: ["Geist", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
