// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { setMatchMediaMatches } from "./vitest.setup.js";

describe("vitest.setup polyfills", () => {
  it("supports matchMedia reporting prefers-reduced-motion: reduce as matched", () => {
    setMatchMediaMatches("(prefers-reduced-motion: reduce)", true);

    expect(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ).toBe(true);
  });

  it("supports matchMedia reporting prefers-reduced-motion: reduce as unmatched", () => {
    setMatchMediaMatches("(prefers-reduced-motion: reduce)", false);

    expect(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ).toBe(false);
  });

  it("stubs HTMLMediaElement play/pause so Audio() doesn't throw", async () => {
    const audio = new Audio();

    await expect(audio.play()).resolves.toBeUndefined();
    expect(() => audio.pause()).not.toThrow();
  });

  it("stubs navigator.vibrate", () => {
    expect(navigator.vibrate(200)).toBeUndefined();
    expect(navigator.vibrate).toHaveBeenCalledWith(200);
  });

  it("provides a working localStorage even though Node shadows jsdom's", () => {
    window.localStorage.setItem("skull-king:test-key", "value");

    expect(window.localStorage.getItem("skull-king:test-key")).toBe("value");

    window.localStorage.clear();

    expect(window.localStorage.getItem("skull-king:test-key")).toBeNull();
  });
});
