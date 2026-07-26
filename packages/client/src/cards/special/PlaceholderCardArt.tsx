import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

/**
 * Fallback for Special Cards without bespoke illustrations yet
 * (backfilled per-screen in later tickets). Still carries the correct
 * aria-label so no Card renders unlabeled.
 */
export function PlaceholderCardArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.ink.light}
      className={className}
    >
      <text
        x="60"
        y="96"
        fontSize="48"
        fontWeight="bold"
        fill={colors.ink.light}
        textAnchor="middle"
      >
        ?
      </text>
    </CardArtFrame>
  );
}
