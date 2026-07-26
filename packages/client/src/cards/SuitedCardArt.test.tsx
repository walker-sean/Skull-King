// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Suit } from "@skull-king/shared";
import { SuitedCardArt } from "./SuitedCardArt.js";

afterEach(() => cleanup());

const SUITS: Suit[] = ["Parrot", "TreasureChest", "PirateMap", "JollyRoger"];
const RANKS = Array.from({ length: 14 }, (_, i) => i + 1);

describe("SuitedCardArt", () => {
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      it(`renders a correctly labeled illustration for ${suit} ${rank}`, () => {
        const label = `${suit} ${rank}`;
        render(<SuitedCardArt suit={suit} rank={rank} aria-label={label} />);

        const image = screen.getByRole("img", { name: label });
        expect(image.tagName).toBe("svg");
      });
    }
  }

  it("renders visually distinct art for different suits of the same rank", () => {
    const { container: parrot } = render(
      <SuitedCardArt suit="Parrot" rank={5} aria-label="Parrot 5" />,
    );
    const { container: jollyRoger } = render(
      <SuitedCardArt suit="JollyRoger" rank={5} aria-label="JollyRoger 5" />,
    );

    expect(parrot.innerHTML).not.toBe(jollyRoger.innerHTML);
  });
});
