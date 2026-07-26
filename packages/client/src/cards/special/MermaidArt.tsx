import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

export function MermaidArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.suit.pirateMap.DEFAULT}
      className={className}
    >
      <circle cx="60" cy="52" r="14" fill={colors.parchment.dark} />
      <path
        d="M46 46c4-4 24-4 28 0"
        fill="none"
        stroke={colors.suit.pirateMap.DEFAULT}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M42 70c-6 20-2 44 18 56 20-12 24-36 18-56-8 8-28 8-36 0z"
        fill={colors.suit.pirateMap.DEFAULT}
      />
      <path
        d="M60 126c-6 8-4 18 6 22 4-10 2-18-6-22z"
        fill={colors.suit.pirateMap.dark}
      />
    </CardArtFrame>
  );
}
