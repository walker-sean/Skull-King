// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { motion } from "framer-motion";
import {
  fadeVariants,
  fadeVariantsReduced,
  flyVariants,
  flyVariantsReduced,
  scaleVariants,
  scaleVariantsReduced,
} from "./primitives.js";

afterEach(() => cleanup());

describe("fadeVariants", () => {
  it("starts hidden and animates to fully visible", () => {
    expect(fadeVariants.initial).toMatchObject({ opacity: 0 });
    expect(fadeVariants.animate).toMatchObject({ opacity: 1 });
  });

  it("a component can apply it without its own transition config", () => {
    const { getByTestId } = render(
      <motion.div
        data-testid="box"
        variants={fadeVariants}
        initial="initial"
        animate="animate"
      />,
    );

    expect(getByTestId("box")).toBeInTheDocument();
  });
});

describe("fadeVariantsReduced", () => {
  it("has no animated transition - it is instant", () => {
    expect(fadeVariantsReduced.initial).toMatchObject({ opacity: 1 });
    expect(fadeVariantsReduced.animate).toMatchObject({
      opacity: 1,
      transition: { duration: 0 },
    });
  });
});

describe("scaleVariants", () => {
  it("starts hidden and scaled down, animates to full size", () => {
    expect(scaleVariants.initial).toMatchObject({ opacity: 0, scale: 0.9 });
    expect(scaleVariants.animate).toMatchObject({ opacity: 1, scale: 1 });
  });
});

describe("scaleVariantsReduced", () => {
  it("has no animated transition - it is instant", () => {
    expect(scaleVariantsReduced.initial).toMatchObject({
      opacity: 1,
      scale: 1,
    });
    expect(scaleVariantsReduced.animate).toMatchObject({
      transition: { duration: 0 },
    });
  });
});

describe("flyVariants", () => {
  it("starts offset in the given direction and flies to rest", () => {
    expect(flyVariants("up").initial).toMatchObject({ opacity: 0, y: 24 });
    expect(flyVariants("down").initial).toMatchObject({ opacity: 0, y: -24 });
    expect(flyVariants("left").initial).toMatchObject({ opacity: 0, x: 24 });
    expect(flyVariants("right").initial).toMatchObject({
      opacity: 0,
      x: -24,
    });
    expect(flyVariants("up").animate).toMatchObject({
      opacity: 1,
      x: 0,
      y: 0,
    });
  });
});

describe("flyVariantsReduced", () => {
  it("has no animated transition - it is instant", () => {
    expect(flyVariantsReduced.initial).toMatchObject({
      opacity: 1,
      x: 0,
      y: 0,
    });
    expect(flyVariantsReduced.animate).toMatchObject({
      transition: { duration: 0 },
    });
  });
});
