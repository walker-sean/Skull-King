import type { Variants } from "framer-motion";

const INSTANT = { duration: 0 } as const;

/**
 * Fade a surface in/out. Pair with `fadeVariantsReduced` via
 * `useReducedMotionSafe` so `prefers-reduced-motion` users get an instant
 * appearance instead of an animated one.
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

export const fadeVariantsReduced: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: INSTANT },
  exit: { opacity: 1, transition: INSTANT },
};

/** Scale + fade a surface in/out, e.g. a card or modal appearing. */
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const scaleVariantsReduced: Variants = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 1, scale: 1, transition: INSTANT },
  exit: { opacity: 1, scale: 1, transition: INSTANT },
};

export type FlyDirection = "up" | "down" | "left" | "right";

const FLY_DISTANCE = 24;

function flyOffset(direction: FlyDirection): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: FLY_DISTANCE };
    case "down":
      return { x: 0, y: -FLY_DISTANCE };
    case "left":
      return { x: FLY_DISTANCE, y: 0 };
    case "right":
      return { x: -FLY_DISTANCE, y: 0 };
  }
}

/**
 * Fly a surface in/out from the given direction, e.g. a toast sliding up
 * from the bottom edge. Pair with `flyVariantsReduced` via
 * `useReducedMotionSafe`.
 */
export function flyVariants(direction: FlyDirection): Variants {
  const offset = flyOffset(direction);

  return {
    initial: { opacity: 0, ...offset },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      ...offset,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };
}

export const flyVariantsReduced: Variants = {
  initial: { opacity: 1, x: 0, y: 0 },
  animate: { opacity: 1, x: 0, y: 0, transition: INSTANT },
  exit: { opacity: 1, x: 0, y: 0, transition: INSTANT },
};
