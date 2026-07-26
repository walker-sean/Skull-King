import { useCallback, useSyncExternalStore } from "react";
import {
  isMuted,
  playSound as playSoundImpl,
  setMuted as setMutedImpl,
  subscribeMuted,
  type SoundId,
} from "./soundManager.js";

/** Component-facing wrapper around the `soundManager` singleton. */
export function useSound(): {
  playSound: (id: SoundId) => void;
  muted: boolean;
  setMuted: (value: boolean) => void;
} {
  const muted = useSyncExternalStore(subscribeMuted, isMuted);

  const playSound = useCallback((id: SoundId) => {
    playSoundImpl(id);
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedImpl(value);
  }, []);

  return { playSound, muted, setMuted };
}
