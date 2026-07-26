import type { Alliance, Player, RoundScore } from "@skull-king/shared";
import { allianceBonusByPlayer } from "./allianceBonus.js";
import { handSizeForRound } from "./dealing.js";

/**
 * Points earned from Bid accuracy alone under Traditional Scoring (see
 * docs/rules/rulebook.md's "Scoring (Traditional)" section): bidding one or more scores
 * +20 per Trick taken on an exact hit, or −10 per Trick of difference on a miss; bidding
 * zero scores +10 (or −10) per card dealt that Round instead, since there's no Trick
 * count to scale by.
 */
function bidPoints(bid: number, tricksWon: number, cardsDealt: number): number {
  if (bid === 0) {
    return tricksWon === 0 ? 10 * cardsDealt : -10 * cardsDealt;
  }
  return bid === tricksWon ? 20 * tricksWon : -10 * Math.abs(bid - tricksWon);
}

/**
 * Scores the just-finished Round under Traditional Scoring and folds the result into
 * each Player's running total (see CONTEXT.md's Scoring Mode and Alliance entries). An
 * Alliance formed this Round pays out +20 to each Allied Player, but only if both of them
 * hit their Bid this Round — one hitting and the other missing pays out nothing.
 */
export function scoreRound(
  round: number,
  players: readonly Player[],
  alliances: readonly Alliance[],
): { players: Player[]; scores: RoundScore[] } {
  const cardsDealt = handSizeForRound(round, players.length);
  const allianceBonusForRound = allianceBonusByPlayer(
    round,
    players,
    alliances,
  );

  const scores: RoundScore[] = players.map((player) => {
    const points = bidPoints(player.bid ?? 0, player.tricksWon, cardsDealt);
    const allianceBonus = allianceBonusForRound.get(player.name) ?? 0;
    const roundPoints = points + allianceBonus;
    return {
      scoringMode: "Traditional",
      playerName: player.name,
      bidPoints: points,
      allianceBonus,
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
