import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function getPrefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The one place `window.matchMedia` is read for `prefers-reduced-motion`.
 * Returns `reducedVariant` when the user's OS/browser has that preference
 * set, otherwise `variant` - so callers can pass a real animation variant
 * alongside a no-op/instant one and let this hook pick between them.
 */
export function useReducedMotionSafe<T>(variant: T, reducedVariant: T): T {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = () =>
      setPrefersReducedMotion(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion ? reducedVariant : variant;
}
