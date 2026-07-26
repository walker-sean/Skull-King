import type { Suit } from "@skull-king/shared";
import type { CardArtProps } from "./CardArtFrame.js";
import { CardArtFrame } from "./CardArtFrame.js";
import { colors } from "../theme/tokens.js";

const SUIT_COLOR: Record<Suit, string> = {
  Parrot: colors.suit.parrot.DEFAULT,
  TreasureChest: colors.suit.treasureChest.DEFAULT,
  PirateMap: colors.suit.pirateMap.DEFAULT,
  JollyRoger: colors.suit.jollyRoger.DEFAULT,
};

function SuitIcon({ suit, color }: { suit: Suit; color: string }) {
  switch (suit) {
    case "Parrot":
      return (
        <path
          d="M60 50c14 0 22 12 22 24 0 10-8 16-14 16-4 0-6-4-8-4s-4 4-8 4c-6 0-14-6-14-16 0-12 8-24 22-24z"
          fill={color}
        />
      );
    case "TreasureChest":
      return (
        <g fill={color}>
          <rect x="42" y="56" width="36" height="24" rx="3" />
          <path d="M42 56c0-8 8-14 18-14s18 6 18 14z" />
        </g>
      );
    case "PirateMap":
      return (
        <path
          d="M40 46l14 6 12-6 14 6v34l-14-6-12 6-14-6z"
          fill={color}
          stroke={color}
          strokeLinejoin="round"
        />
      );
    case "JollyRoger":
      return (
        <g fill={color}>
          <circle cx="60" cy="60" r="14" />
          <rect
            x="46"
            y="80"
            width="10"
            height="10"
            transform="rotate(45 51 85)"
          />
          <rect
            x="64"
            y="80"
            width="10"
            height="10"
            transform="rotate(-45 69 85)"
          />
        </g>
      );
  }
}

interface SuitedCardArtProps extends CardArtProps {
  suit: Suit;
  rank: number;
}

export function SuitedCardArt({
  suit,
  rank,
  "aria-label": ariaLabel,
  className,
}: SuitedCardArtProps) {
  const color = SUIT_COLOR[suit];

  return (
    <CardArtFrame
      aria-label={ariaLabel}
      frameColor={color}
      className={className}
    >
      <text x="14" y="28" fontSize="20" fontWeight="bold" fill={color}>
        {rank}
      </text>
      <SuitIcon suit={suit} color={color} />
      <text
        x="106"
        y="152"
        fontSize="20"
        fontWeight="bold"
        fill={color}
        textAnchor="end"
      >
        {rank}
      </text>
    </CardArtFrame>
  );
}
