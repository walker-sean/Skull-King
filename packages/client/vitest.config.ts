import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import rootConfig from "../../vitest.config.js";

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react()],
    test: {
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      environment: "jsdom",
      setupFiles: ["./src/vitest.setup.ts"],
    },
  }),
);
