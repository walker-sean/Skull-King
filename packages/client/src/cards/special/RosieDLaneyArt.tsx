import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

/** Pilot illustration for the Pirate "Rosie D'Laney". */
export function RosieDLaneyArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.red.DEFAULT}
      className={className}
    >
      <circle cx="60" cy="60" r="16" fill={colors.parchment.dark} />
      <path
        d="M42 54c4-10 32-10 36 0"
        fill="none"
        stroke={colors.red.DEFAULT}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="52" cy="60" r="3" fill={colors.ink.DEFAULT} />
      <circle cx="68" cy="60" r="3" fill={colors.ink.DEFAULT} />
      <path
        d="M50 70q10 8 20 0"
        fill="none"
        stroke={colors.ink.DEFAULT}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M30 96c8-10 22-14 30-14s22 4 30 14v40H30z"
        fill={colors.red.DEFAULT}
      />
      <rect x="46" y="110" width="28" height="6" fill={colors.gold.DEFAULT} />
    </CardArtFrame>
  );
}
