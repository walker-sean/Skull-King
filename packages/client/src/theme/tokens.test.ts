import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config.js";
import { colors, fontFamily, fontSize } from "./tokens.js";

describe("tailwind.config.ts theme tokens", () => {
  it("reads its palette from theme/tokens.ts rather than a hand-duplicated copy", () => {
    expect(tailwindConfig.theme?.extend?.colors).toBe(colors);
  });

  it("reads its font families from theme/tokens.ts", () => {
    expect(tailwindConfig.theme?.extend?.fontFamily).toBe(fontFamily);
  });

  it("reads its type scale from theme/tokens.ts", () => {
    expect(tailwindConfig.theme?.extend?.fontSize).toBe(fontSize);
  });
});
