import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: "oklch(var(--card) / <alpha-value>)",
        popover: "oklch(var(--popover) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        muted: "oklch(var(--muted-foreground) / <alpha-value>)",
        "muted-surface": "oklch(var(--muted) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        sidebar: "oklch(var(--sidebar) / <alpha-value>)",
        "sidebar-border": "oklch(var(--sidebar-border) / <alpha-value>)",
        "sidebar-accent": "oklch(var(--sidebar-accent) / <alpha-value>)",
        ember: "oklch(var(--ember) / <alpha-value>)",
        success: "oklch(var(--success) / <alpha-value>)",
        warning: "oklch(var(--warning) / <alpha-value>)",
        destructive: "oklch(var(--destructive) / <alpha-value>)",
        ink: "oklch(var(--foreground) / <alpha-value>)",
        slate: "oklch(var(--muted-foreground) / <alpha-value>)",
        paper: "oklch(var(--background) / <alpha-value>)",
        cream: "oklch(var(--muted) / <alpha-value>)",
        brick: "oklch(var(--ember) / <alpha-value>)",
        good: "oklch(var(--success) / <alpha-value>)",
        dark: "oklch(var(--background) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Sora", "system-ui", "sans-serif"],
        mono: ["Manrope", "system-ui", "sans-serif"],
        editorial: ["Sora", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.125rem)",
        sm: "calc(var(--radius) - 0.25rem)",
      },
    },
  },
  plugins: [],
} satisfies Config;
