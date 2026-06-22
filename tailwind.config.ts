import type { Config } from "tailwindcss";

/**
 * Design tokens are driven by CSS variables (see globals.css) so the entire
 * palette flips between the dark and light ("paper") themes with one class.
 */
const config: Config = {
  darkMode: "class",
  // A few color utilities are composed dynamically (e.g. `text-${tone}`).
  safelist: [
    { pattern: /(text|bg|ring|border)-(iris|lime|coral|gold)/, variants: ["hover"] },
    { pattern: /(bg|border)-(iris|lime|coral|gold)\/(10|12|15|20|30|40)/, variants: ["hover"] },
  ],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        // Accents: iris = study/AI, lime = XP/reward, coral = live game, gold = premium
        iris: "rgb(var(--iris) / <alpha-value>)",
        lime: "rgb(var(--lime) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)",
        glow: "0 0 0 1px rgb(var(--iris) / 0.35), 0 8px 40px -8px rgb(var(--iris) / 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
