import type { Transition } from "framer-motion";

const CARD_FLIGHT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
};

const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * The shared `layoutId` a card uses to fly between named locations (e.g.
 * `"hand"` -> `"table"`). Framer Motion animates the position/size delta
 * between any two mounted elements that share a `layoutId`, so a card
 * re-parented from one location's layout to another's flies between them
 * automatically - no manual coordinate math needed.
 */
export function cardFlightLayoutId(cardId: string): string {
  return `card-flight:${cardId}`;
}

/**
 * Transition config for a card's shared-element flight. Instant when the
 * user prefers reduced motion, so the card jumps straight to its new
 * location instead of animating the move.
 */
export function cardFlightTransition(
  prefersReducedMotion: boolean,
): Transition {
  return prefersReducedMotion ? INSTANT_TRANSITION : CARD_FLIGHT_TRANSITION;
}

/**
 * The props a card needs to fly between two named locations (e.g. a Hand
 * list and the Table). Spread this onto the `motion.div` (or similar)
 * rendered at *each* location a given card can appear at - Framer Motion
 * detects the same `layoutId` re-mounted under a different parent and
 * animates the delta, so callers never compute per-location coordinates:
 *
 * ```tsx
 * <motion.div {...cardFlightProps(card.id, prefersReducedMotion)} />
 * ```
 */
export function cardFlightProps(
  cardId: string,
  prefersReducedMotion: boolean,
): { layoutId: string; transition: Transition } {
  return {
    layoutId: cardFlightLayoutId(cardId),
    transition: cardFlightTransition(prefersReducedMotion),
  };
}
