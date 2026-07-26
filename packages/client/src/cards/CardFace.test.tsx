// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Card } from "@skull-king/shared";
import { CardFace } from "./CardFace.js";
import { cardLabel } from "../cardLabel.js";

afterEach(() => cleanup());

const cases: Card[] = [
  { kind: "Suited", suit: "Parrot", rank: 7 },
  { kind: "Suited", suit: "TreasureChest", rank: 14 },
  { kind: "Suited", suit: "PirateMap", rank: 1 },
  { kind: "Suited", suit: "JollyRoger", rank: 9 },
  { kind: "Pirate", name: "RosieDLaney" },
  { kind: "Pirate", name: "BendtTheBandit" },
  { kind: "Tigress" },
  { kind: "Tigress", declaredAs: "Pirate" },
  { kind: "SkullKing" },
  { kind: "Mermaid" },
  { kind: "Escape" },
  { kind: "Loot" },
  { kind: "Kraken" },
  { kind: "WhiteWhale" },
];

describe("CardFace", () => {
  it.each(cases)(
    "renders an accessible image whose name matches cardLabel for $kind",
    (card) => {
      render(<CardFace card={card} />);

      const image = screen.getByRole("img", { name: cardLabel(card) });
      expect(image).toBeInTheDocument();
      expect(image.tagName).toBe("svg");
    },
  );

  it("falls back to a labeled placeholder for a not-yet-illustrated Pirate", () => {
    const card: Card = { kind: "Pirate", name: "HarryTheGiant" };
    render(<CardFace card={card} />);

    expect(
      screen.getByRole("img", { name: cardLabel(card) }),
    ).toBeInTheDocument();
  });

  it("falls back to a labeled placeholder for Escape, Loot, and Tigress", () => {
    const escapesLootsAndTigresses: Card[] = [
      { kind: "Escape" },
      { kind: "Loot" },
      { kind: "Tigress" },
    ];

    for (const card of escapesLootsAndTigresses) {
      const { unmount } = render(<CardFace card={card} />);
      expect(
        screen.getByRole("img", { name: cardLabel(card) }),
      ).toBeInTheDocument();
      unmount();
    }
  });
});
