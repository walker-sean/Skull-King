import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

export function WhiteWhaleArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.suit.parrot.DEFAULT}
      className={className}
    >
      <path
        d="M28 76c10-16 34-24 54-16 12 5 20 16 20 16s-8 4-16 4c4 6 4 14 0 18-8-2-14-8-16-14-10 4-24 4-34-2-4 10-14 16-14 16s-4-14 6-22z"
        fill={colors.parchment.dark}
        stroke={colors.suit.parrot.DEFAULT}
        strokeWidth="3"
      />
      <circle cx="48" cy="72" r="3" fill={colors.ink.DEFAULT} />
      <path
        d="M20 96q10-6 20 0"
        fill="none"
        stroke={colors.suit.parrot.DEFAULT}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </CardArtFrame>
  );
}
