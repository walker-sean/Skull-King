import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

export function KrakenArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.suit.jollyRoger.DEFAULT}
      className={className}
    >
      <circle cx="60" cy="60" r="20" fill={colors.suit.jollyRoger.DEFAULT} />
      <circle cx="52" cy="56" r="3" fill={colors.parchment.DEFAULT} />
      <circle cx="68" cy="56" r="3" fill={colors.parchment.DEFAULT} />
      <path
        d="M30 84q-8 20 0 40q6-10 10-16z"
        fill={colors.suit.jollyRoger.DEFAULT}
      />
      <path
        d="M48 90q-4 24 4 46q6-12 8-20z"
        fill={colors.suit.jollyRoger.DEFAULT}
      />
      <path
        d="M72 90q4 24 -4 46q-6-12 -8-20z"
        fill={colors.suit.jollyRoger.dark}
      />
      <path
        d="M90 84q8 20 0 40q-6-10 -10-16z"
        fill={colors.suit.jollyRoger.dark}
      />
    </CardArtFrame>
  );
}
