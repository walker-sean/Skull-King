/**
 * Single call site for `navigator.vibrate`. No-ops silently where the
 * Vibration API is unsupported (e.g. iOS Safari has none) rather than
 * throwing.
 */

/** Short pulse used to cue that it's the player's turn. */
export const TURN_PING_PATTERN = [40];

export function vibrate(pattern: number | number[]): void {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  navigator.vibrate(pattern);
}

export function vibrateTurnPing(): void {
  vibrate(TURN_PING_PATTERN);
}
