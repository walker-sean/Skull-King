export type Suit = "Parrot" | "TreasureChest" | "PirateMap" | "JollyRoger";

export type Card =
  | { kind: "Suited"; suit: Suit; rank: number }
  | { kind: "Pirate" }
  | { kind: "Tigress"; declaredAs?: "Pirate" | "Escape" }
  | { kind: "SkullKing" }
  | { kind: "Mermaid" }
  | { kind: "Escape" }
  | { kind: "Loot" }
  | { kind: "Kraken" }
  | { kind: "WhiteWhale" };
