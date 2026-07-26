import type { Config } from "tailwindcss";
import { colors, fontFamily, fontSize } from "./src/theme/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
    },
  },
} satisfies Config;
