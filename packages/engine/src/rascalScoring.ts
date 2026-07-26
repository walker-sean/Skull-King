import type {
  Alliance,
  CardBonus,
  Outcome,
  PirateBet,
  Player,
  RascalRoundScore,
} from "@skull-king/shared";
import { allianceBonusByPlayer } from "./allianceBonus.js";
import { handSizeForRound } from "./dealing.js";

/**
 * A Round's Bid-accuracy result (see docs/rules/rascal-scoring.md and CONTEXT.md's Outcome
 * entry): exact Bid, off by one, or off by two or more.
 */
export function classifyOutcome(bid: number, tricksWon: number): Outcome {
  const diff = Math.abs(bid - tricksWon);
  if (diff === 0) return "DirectHit";
  if (diff === 1) return "GlancingBlow";
  return "CompleteMiss";
}

/** The share of a Round's potential score (or Bonus) an Outcome earns (see rascal-scoring.md). */
function outcomeShare(outcome: Outcome): number {
  switch (outcome) {
    case "DirectHit":
      return 1;
    case "GlancingBlow":
      return 0.5;
    case "CompleteMiss":
      return 0;
  }
}

/**
 * Scores the just-finished Round under Rascal Scoring and folds the result into each
 * Player's running total (see docs/rules/rascal-scoring.md and CONTEXT.md's Scoring Mode,
 * Outcome, Bonus, Alliance entries). Every Player has the same potential Round score
 * (10 points per card dealt) and potential Bonus (their captured cards' Bonus points),
 * earned in full, half, or none per their Outcome. An Alliance formed this Round pays out
 * a flat +20 to each Allied Player, but only if both hit their Bid exactly. A Rascal of
 * Roatan bet placed this Round wins or loses its full amount based on hitting the Bid
 * exactly — it isn't split by Outcome share, since a bet is either won or lost outright.
 */
export function scoreRascalRound(
  round: number,
  players: readonly Player[],
  alliances: readonly Alliance[],
  cardBonuses: readonly CardBonus[],
  pirateBets: readonly PirateBet[],
): { players: Player[]; scores: RascalRoundScore[] } {
  const cardsDealt = handSizeForRound(round, players.length);
  const potential = 10 * cardsDealt;
  const hitBid = new Map(
    players.map((player) => [player.name, player.bid === player.tricksWon]),
  );
  const allianceBonusForRound = allianceBonusByPlayer(
    round,
    players,
    alliances,
  );

  const scores: RascalRoundScore[] = players.map((player) => {
    const outcome = classifyOutcome(player.bid ?? 0, player.tricksWon);
    const share = outcomeShare(outcome);

    const bidPoints = potential * share;

    const bonusPotential = cardBonuses
      .filter(
        (bonus) => bonus.round === round && bonus.playerName === player.name,
      )
      .reduce((sum, bonus) => sum + bonus.points, 0);
    const bonusPoints = bonusPotential * share;

    const allianceBonus = allianceBonusForRound.get(player.name) ?? 0;

    const betResult = pirateBets
      .filter((bet) => bet.round === round && bet.playerName === player.name)
      .reduce(
        (sum, bet) =>
          sum + (hitBid.get(player.name) === true ? bet.amount : -bet.amount),
        0,
      );

    const roundPoints = bidPoints + bonusPoints + allianceBonus + betResult;

    return {
      scoringMode: "Rascal",
      playerName: player.name,
      outcome,
      bidPoints,
      bonusPoints,
      allianceBonus,
      betResult,
      roundPoints,
      totalScore: player.score + roundPoints,
    };
  });

  // scores is built by mapping over players above, so the two stay index-aligned.
  const scoredPlayers = players.map((player, index) => ({
    ...player,
    score: scores[index]!.totalScore,
  }));

  return { players: scoredPlayers, scores };
}
