import type { Card, TrickPlay } from "@skull-king/shared";

const TRUMP_SUIT = "JollyRoger";

/**
 * Whether a card counts as a Pirate for the Bonus Points table's capture chain (see
 * CONTEXT.md's Bonus entry): a named Pirate, or a Tigress declared as one, since the
 * rulebook treats a Tigress-as-Pirate identically to a Pirate in the Capture Hierarchy.
 */
function isPirateLike(card: Card): boolean {
  return (
    card.kind === "Pirate" ||
    (card.kind === "Tigress" && card.declaredAs === "Pirate")
  );
}

/**
 * The Bonus points a Trick's winner earns for capturing specific cards (see
 * docs/rules/rulebook.md's "Bonus Points" table): a standard-suit numbered-14 scores +10
 * each, the trump-suit's numbered-14 scores +20, and the Mermaid–Pirate–Skull King capture
 * chain scores based on which of those three the winner's own card was, relative to the
 * others present in the same Trick. Order of play doesn't matter — only who ends up
 * capturing the card, i.e. who won the Trick (see the rulebook's worked example: when a
 * Mermaid wins over both a Pirate and the Skull King in the same Trick, only the Skull
 * King's capture bonus is earned — the Pirate never won, so no Pirate-capture bonus
 * applies). Capturing a Mermaid with a Pirate is currently unreachable via `playCard`
 * under this project's total-order Capture Hierarchy (see CONTEXT.md's Capture Hierarchy
 * entry — a Mermaid always beats a Pirate), but is still computed here for parity with
 * the rulebook's table.
 */
export function captureBonusPoints(
  trick: readonly TrickPlay[],
  winnerName: string,
): number {
  const winningPlay = trick.find((play) => play.playerName === winnerName);
  if (winningPlay === undefined) {
    return 0;
  }

  let points = 0;

  for (const play of trick) {
    if (play.card.kind === "Suited" && play.card.rank === 14) {
      points += play.card.suit === TRUMP_SUIT ? 20 : 10;
    }
  }

  if (isPirateLike(winningPlay.card)) {
    points += trick.filter((play) => play.card.kind === "Mermaid").length * 20;
  }

  if (winningPlay.card.kind === "SkullKing") {
    points += trick.filter((play) => isPirateLike(play.card)).length * 30;
  }

  if (winningPlay.card.kind === "Mermaid") {
    points += trick.some((play) => play.card.kind === "SkullKing") ? 40 : 0;
  }

  return points;
}
