import type { Card } from "@skull-king/shared";

export function cardLabel(card: Card): string {
  switch (card.kind) {
    case "Suited":
      return `${card.suit} ${card.rank}`;
    case "Pirate":
      return `Pirate: ${card.name}`;
    case "Tigress":
      return card.declaredAs ? `Tigress (${card.declaredAs})` : "Tigress";
    case "SkullKing":
      return "Skull King";
    case "Mermaid":
      return "Mermaid";
    case "Escape":
      return "Escape";
    case "Loot":
      return "Loot";
    case "Kraken":
      return "Kraken";
    case "WhiteWhale":
      return "White Whale";
  }
}
