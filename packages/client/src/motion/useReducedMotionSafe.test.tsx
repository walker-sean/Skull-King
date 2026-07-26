// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { setMatchMediaMatches } from "../vitest.setup.js";
import { useReducedMotionSafe } from "./useReducedMotionSafe.js";

afterEach(() => cleanup());

function Probe(): React.JSX.Element {
  const label = useReducedMotionSafe("real", "reduced");
  return <span>{label}</span>;
}

describe("useReducedMotionSafe", () => {
  it("returns the real variant when prefers-reduced-motion is not set", () => {
    setMatchMediaMatches("(prefers-reduced-motion: reduce)", false);

    render(<Probe />);

    expect(screen.getByText("real")).toBeInTheDocument();
  });

  it("returns the no-op/instant variant when prefers-reduced-motion is set", () => {
    setMatchMediaMatches("(prefers-reduced-motion: reduce)", true);

    render(<Probe />);

    expect(screen.getByText("reduced")).toBeInTheDocument();
  });
});
