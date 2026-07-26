import { vi } from "vitest";

const mediaQueryState = new Map<string, boolean>();

function setMatchMediaMatches(query: string, matches: boolean): void {
  mediaQueryState.set(query, matches);
}

// No test needs change notifications, so listener registration is a no-op -
// only `matches` (read via `setMatchMediaMatches`) needs to be live.
class MockMediaQueryList implements MediaQueryList {
  media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null =
    null;

  constructor(media: string) {
    this.media = media;
  }

  get matches(): boolean {
    return mediaQueryState.get(this.media) ?? false;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  addListener(): void {}
  removeListener(): void {}

  dispatchEvent(): boolean {
    return true;
  }
}

window.matchMedia = vi.fn(
  (query: string) => new MockMediaQueryList(query),
) as unknown as typeof window.matchMedia;

// jsdom's HTMLMediaElement.play/pause throw "not implemented" - stub them so
// components that call Audio().play()/.pause() don't crash in tests.
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

Object.defineProperty(navigator, "vibrate", {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Node's own global `localStorage` (stubbed out here since no
// `--localstorage-file` is configured) shadows jsdom's working
// implementation on `window`/`globalThis` in this environment. Replace it
// with a simple in-memory Storage so code under test can actually persist
// values across a re-import within the same test run.
class MemoryStorage implements Storage {
  #store = new Map<string, string>();

  get length(): number {
    return this.#store.size;
  }

  clear(): void {
    this.#store.clear();
  }

  getItem(key: string): string | null {
    return this.#store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.#store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value);
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

export { setMatchMediaMatches };
