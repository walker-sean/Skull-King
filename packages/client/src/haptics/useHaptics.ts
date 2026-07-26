import { vibrateTurnPing } from "./haptics.js";

/** Component-facing wrapper around {@link haptics.ts}'s vibrate functions. */
export function useHaptics() {
  return { turnPing: vibrateTurnPing };
}
