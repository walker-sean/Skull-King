import { colors } from "../../theme/tokens.js";
import type { CardArtProps } from "../CardArtFrame.js";
import { CardArtFrame } from "../CardArtFrame.js";

export function SkullKingArt({
  "aria-label": ariaLabel,
  className,
}: CardArtProps) {
  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={colors.ink.DEFAULT}
      className={className}
    >
      <path
        d="M38 96c0-22 10-40 22-40s22 18 22 40z"
        fill={colors.parchment.dark}
      />
      <circle cx="49" cy="86" r="6" fill={colors.ink.DEFAULT} />
      <circle cx="71" cy="86" r="6" fill={colors.ink.DEFAULT} />
      <path d="M52 100h6l-2 8zM62 100h6l-2 8z" fill={colors.ink.DEFAULT} />
      <path d="M42 60l6-16 12 8 12-8 6 16z" fill={colors.gold.DEFAULT} />
      <circle cx="60" cy="40" r="4" fill={colors.gold.DEFAULT} />
      <path
        d="M20 140c10-10 20-14 40-14s30 4 40 14"
        fill="none"
        stroke={colors.ink.DEFAULT}
        strokeWidth="4"
      />
    </CardArtFrame>
  );
}
