// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../vitest.setup.js";
import { TURN_PING_PATTERN } from "./haptics.js";
import { useHaptics } from "./useHaptics.js";

describe("useHaptics", () => {
  it("turnPing invokes navigator.vibrate with the turn-ping pattern", () => {
    const { result } = renderHook(() => useHaptics());

    result.current.turnPing();

    expect(navigator.vibrate).toHaveBeenCalledWith(TURN_PING_PATTERN);
  });

  it("does not throw when navigator.vibrate is undefined", () => {
    const original = navigator.vibrate;
    // @ts-expect-error simulating an environment without the Vibration API
    delete navigator.vibrate;

    const { result } = renderHook(() => useHaptics());

    expect(() => result.current.turnPing()).not.toThrow();

    navigator.vibrate = original;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
