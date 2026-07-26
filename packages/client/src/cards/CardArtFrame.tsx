import type { ReactNode } from "react";
import { colors } from "../theme/tokens.js";

/** Props every Card art component takes: the accessible name and an optional className for layout. */
export interface CardArtProps {
  "aria-label": string;
  className?: string;
}

interface CardArtFrameProps extends CardArtProps {
  frameColor: string;
  children: ReactNode;
}

/**
 * Shared parchment-and-border frame for Card illustrations (Suited and
 * Special alike), so each one only needs to supply its own artwork.
 */
export function CardArtFrame({
  "aria-label": ariaLabel,
  frameColor,
  className,
  children,
}: CardArtFrameProps) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox="0 0 120 168"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="116"
        height="164"
        rx="10"
        fill={colors.parchment.DEFAULT}
        stroke={frameColor}
        strokeWidth="4"
      />
      {children}
    </svg>
  );
}
