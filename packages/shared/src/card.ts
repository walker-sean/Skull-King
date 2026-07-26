export type Suit = "Parrot" | "TreasureChest" | "PirateMap" | "JollyRoger";

/**
 * The 5 individually named Pirates (see CONTEXT.md's Pirate entry) — their identity matters
 * once Advanced Pirate Abilities are in play, since winning a Trick by playing a specific
 * named Pirate unlocks that Pirate's own ability.
 */
export type PirateName =
  | "RosieDLaney"
  | "BendtTheBandit"
  | "RascalOfRoatan"
  | "JuanitaJade"
  | "HarryTheGiant";

export type Card =
  | { kind: "Suited"; suit: Suit; rank: number }
  | { kind: "Pirate"; name: PirateName }
  | { kind: "Tigress"; declaredAs?: "Pirate" | "Escape" }
  | { kind: "SkullKing" }
  | { kind: "Mermaid" }
  | { kind: "Escape" }
  | { kind: "Loot" }
  | { kind: "Kraken" }
  | { kind: "WhiteWhale" };
