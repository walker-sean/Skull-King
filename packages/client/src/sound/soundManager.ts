/**
 * The one place `new Audio()` is constructed. Pools one `HTMLAudioElement`
 * per sound id, created lazily on first `playSound` call so assets aren't
 * fetched until a user gesture triggers it (required for iOS Safari's
 * autoplay gate, and a happy side effect for everyone else).
 *
 * Mute state persists in `localStorage` and is never sent through
 * `socketClient`/`viewModel`/`RoomState` - see ADR-0002: this app has no
 * accounts, so mute is a device preference, not Room state.
 */

const MUTED_STORAGE_KEY = "skull-king:sound-muted";

export type SoundId = "cardPlay" | "trickWin" | "roundScore" | "bidReveal";

const soundSources: Record<SoundId, string> = {
  cardPlay: "/sounds/card-play.mp3",
  trickWin: "/sounds/trick-win.mp3",
  roundScore: "/sounds/round-score.mp3",
  bidReveal: "/sounds/bid-reveal.mp3",
};

const pool = new Map<SoundId, HTMLAudioElement>();
const mutedListeners = new Set<() => void>();

function readMutedFromStorage(): boolean {
  return window.localStorage.getItem(MUTED_STORAGE_KEY) === "true";
}

let muted = readMutedFromStorage();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  window.localStorage.setItem(MUTED_STORAGE_KEY, String(value));
  mutedListeners.forEach((listener) => listener());
}

export function subscribeMuted(listener: () => void): () => void {
  mutedListeners.add(listener);
  return () => mutedListeners.delete(listener);
}

function getPooledAudio(id: SoundId): HTMLAudioElement {
  let audio = pool.get(id);
  if (!audio) {
    audio = new Audio(soundSources[id]);
    pool.set(id, audio);
  }
  return audio;
}

export function playSound(id: SoundId): void {
  if (muted) return;

  const audio = getPooledAudio(id);
  audio.currentTime = 0;
  void audio.play();
}
