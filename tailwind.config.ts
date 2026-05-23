import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141C2D",
        slate: "#4A5365",
        muted: "#7A8294",
        paper: "#F6F4EF",
        cream: "#F1EDE4",
        brick: "#C2542D",
        good: "#1F7A52",
        dark: "#0A0A0A",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
