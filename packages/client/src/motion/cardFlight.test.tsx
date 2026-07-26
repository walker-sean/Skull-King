// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LayoutGroup, motion } from "framer-motion";
import {
  cardFlightLayoutId,
  cardFlightProps,
  cardFlightTransition,
} from "./cardFlight.js";

afterEach(() => cleanup());

describe("cardFlightLayoutId", () => {
  it("is stable for the same card id", () => {
    expect(cardFlightLayoutId("card-7")).toBe(cardFlightLayoutId("card-7"));
  });

  it("differs between card ids", () => {
    expect(cardFlightLayoutId("card-7")).not.toBe(cardFlightLayoutId("card-8"));
  });
});

describe("cardFlightTransition", () => {
  it("animates with a spring when reduced motion is not preferred", () => {
    expect(cardFlightTransition(false)).toMatchObject({ type: "spring" });
  });

  it("is instant when reduced motion is preferred", () => {
    expect(cardFlightTransition(true)).toMatchObject({ duration: 0 });
  });
});

describe("cardFlightProps", () => {
  it("bundles the layoutId and transition for a card", () => {
    expect(cardFlightProps("card-7", false)).toEqual({
      layoutId: cardFlightLayoutId("card-7"),
      transition: cardFlightTransition(false),
    });
  });
});

describe("a card flying between two named locations", () => {
  function Hand(): React.JSX.Element {
    return (
      <div data-testid="hand">
        <motion.div data-testid="card" {...cardFlightProps("card-7", false)} />
      </div>
    );
  }

  function Table(): React.JSX.Element {
    return (
      <div data-testid="table">
        <motion.div data-testid="card" {...cardFlightProps("card-7", false)} />
      </div>
    );
  }

  it("re-mounts the same layoutId under the table location once the trick is swept", () => {
    const { getByTestId, rerender } = render(
      <LayoutGroup>
        <Hand />
      </LayoutGroup>,
    );

    expect(getByTestId("hand")).toContainElement(getByTestId("card"));

    rerender(
      <LayoutGroup>
        <Table />
      </LayoutGroup>,
    );

    expect(getByTestId("table")).toContainElement(getByTestId("card"));
  });
});
