/**
 * Single source of truth for the pirate-nautical palette and type scale.
 *
 * `tailwind.config.ts` reads these constants directly (rather than
 * duplicating hex values), and any non-className consumer (raw SVG `fill=`,
 * JS-computed motion values) should import from here too, per ADR-0013.
 */

export const colors = {
  parchment: {
    light: "#faf3e0",
    DEFAULT: "#f3e6c8",
    dark: "#e4d2a0",
  },
  ink: {
    light: "#5c4630",
    DEFAULT: "#3b2a1a",
  },
  gold: {
    light: "#e0c15b",
    DEFAULT: "#c9a227",
    dark: "#9c7d1d",
  },
  red: {
    light: "#b34d4d",
    DEFAULT: "#8b2e2e",
    dark: "#5e1f1f",
  },
} as const;

export const fontFamily = {
  display: ['"Pirata One"', "cursive"],
  sans: ["system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
} as const;

export const fontSize = {
  "display-sm": ["1.375rem", { lineHeight: "1.3" }],
  "display-md": ["1.75rem", { lineHeight: "1.25" }],
  "display-lg": ["2.25rem", { lineHeight: "1.2" }],
  "display-xl": ["3rem", { lineHeight: "1.1" }],
} as const;
