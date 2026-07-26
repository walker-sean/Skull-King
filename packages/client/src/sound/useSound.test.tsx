// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSound } from "./useSound.js";

const playSpy = window.HTMLMediaElement.prototype
  .play as unknown as ReturnType<typeof vi.fn>;

describe("useSound", () => {
  beforeEach(() => {
    window.localStorage.clear();
    playSpy.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("plays a sound via the underlying soundManager", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("cardPlay");
    });

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("reflects mute state and re-renders when it changes", () => {
    const { result } = renderHook(() => useSound());

    expect(result.current.muted).toBe(false);

    act(() => {
      result.current.setMuted(true);
    });

    expect(result.current.muted).toBe(true);

    act(() => {
      result.current.playSound("trickWin");
    });
    expect(playSpy).not.toHaveBeenCalled();
  });
});
