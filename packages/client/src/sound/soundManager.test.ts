// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const playSpy = window.HTMLMediaElement.prototype
  .play as unknown as ReturnType<typeof vi.fn>;

async function freshSoundManager() {
  vi.resetModules();
  return import("./soundManager.js");
}

describe("soundManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    playSpy.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("plays the pooled audio element for a sound id", async () => {
    const { playSound } = await freshSoundManager();

    playSound("cardPlay");

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses the same pooled element across repeated plays of the same id", async () => {
    const { playSound } = await freshSoundManager();

    playSound("trickWin");
    playSound("trickWin");

    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("does not call play() while muted", async () => {
    const { playSound, setMuted } = await freshSoundManager();

    setMuted(true);
    playSound("bidReveal");

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("persists the mute flag across a simulated reload via localStorage", async () => {
    const first = await freshSoundManager();
    first.setMuted(true);

    const second = await freshSoundManager();

    expect(second.isMuted()).toBe(true);

    second.playSound("roundScore");
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("does not fetch/construct sound assets until playSound is first called", async () => {
    const audioSpy = vi.spyOn(window, "Audio");
    const { playSound } = await freshSoundManager();

    expect(audioSpy).not.toHaveBeenCalled();

    playSound("cardPlay");

    expect(audioSpy).toHaveBeenCalledTimes(1);
    audioSpy.mockRestore();
  });
});
