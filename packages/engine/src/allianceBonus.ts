import type { Alliance, Player } from "@skull-king/shared";

/**
 * Maps each Player's name to the Alliance bonus they earned this Round (see CONTEXT.md's
 * Alliance entry): +20 for each Alliance formed this Round where both Allied Players hit
 * their Bid exactly. Shared by Traditional and Rascal Scoring, since the payout rule is
 * identical under both Modes.
 */
export function allianceBonusByPlayer(
  round: number,
  players: readonly Player[],
  alliances: readonly Alliance[],
): Map<string, number> {
  const hitBid = new Map(
    players.map((player) => [player.name, player.bid === player.tricksWon]),
  );

  const bonusByPlayer = new Map<string, number>();
  for (const alliance of alliances) {
    if (alliance.round !== round) continue;
    const bothHit =
      hitBid.get(alliance.lootPlayerName) === true &&
      hitBid.get(alliance.winnerName) === true;
    if (!bothHit) continue;
    for (const name of [alliance.lootPlayerName, alliance.winnerName]) {
      bonusByPlayer.set(name, (bonusByPlayer.get(name) ?? 0) + 20);
    }
  }
  return bonusByPlayer;
}
