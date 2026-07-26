// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../vitest.setup.js";
import { TURN_PING_PATTERN, vibrate, vibrateTurnPing } from "./haptics.js";

describe("vibrate", () => {
  it("invokes navigator.vibrate with the given pattern", () => {
    vibrate([10, 20, 10]);

    expect(navigator.vibrate).toHaveBeenCalledWith([10, 20, 10]);
  });

  it("does not throw when navigator.vibrate is undefined", () => {
    const original = navigator.vibrate;
    // @ts-expect-error simulating an environment without the Vibration API
    delete navigator.vibrate;

    expect(() => vibrate([10])).not.toThrow();

    navigator.vibrate = original;
  });
});

describe("vibrateTurnPing", () => {
  it("invokes navigator.vibrate with the turn-ping pattern", () => {
    vibrateTurnPing();

    expect(navigator.vibrate).toHaveBeenCalledWith(TURN_PING_PATTERN);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
