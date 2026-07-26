import type { Card } from "@skull-king/shared";
import { cardLabel } from "../cardLabel.js";
import { SuitedCardArt } from "./SuitedCardArt.js";
import { KrakenArt } from "./special/KrakenArt.js";
import { MermaidArt } from "./special/MermaidArt.js";
import { PlaceholderCardArt } from "./special/PlaceholderCardArt.js";
import { RosieDLaneyArt } from "./special/RosieDLaneyArt.js";
import { SkullKingArt } from "./special/SkullKingArt.js";
import { WhiteWhaleArt } from "./special/WhiteWhaleArt.js";

interface CardFaceProps {
  card: Card;
  className?: string;
}

/**
 * Single dispatch point for Card art, mirroring App.tsx's role as the one
 * dispatch point for screens. Reuses cardLabel.ts so the accessible name
 * always matches the existing text rendering for the same Card.
 */
export function CardFace({ card, className }: CardFaceProps) {
  const ariaLabel = cardLabel(card);

  switch (card.kind) {
    case "Suited":
      return (
        <SuitedCardArt
          suit={card.suit}
          rank={card.rank}
          aria-label={ariaLabel}
          className={className}
        />
      );
    case "Pirate":
      return card.name === "RosieDLaney" ? (
        <RosieDLaneyArt aria-label={ariaLabel} className={className} />
      ) : (
        <PlaceholderCardArt aria-label={ariaLabel} className={className} />
      );
    case "SkullKing":
      return <SkullKingArt aria-label={ariaLabel} className={className} />;
    case "Mermaid":
      return <MermaidArt aria-label={ariaLabel} className={className} />;
    case "Kraken":
      return <KrakenArt aria-label={ariaLabel} className={className} />;
    case "WhiteWhale":
      return <WhiteWhaleArt aria-label={ariaLabel} className={className} />;
    case "Tigress":
    case "Escape":
    case "Loot":
      return (
        <PlaceholderCardArt aria-label={ariaLabel} className={className} />
      );
  }
}
