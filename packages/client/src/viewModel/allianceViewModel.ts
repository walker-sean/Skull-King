import type { Alliance, RoomState } from "@skull-king/shared";

/**
 * Detects a Loot Alliance that just formed, by diffing previous/next RoomState.alliances
 * (no new event needed — mirrors deriveTrickOutcome's diff-based narration in
 * trickPlayViewModel.ts). Returns the most recently formed Alliance, or null if none formed
 * since the last state.
 */
export function deriveNewAlliance(
  previous: RoomState | null,
  next: RoomState,
): Alliance | null {
  if (previous === null) return null;
  if (next.alliances.length <= previous.alliances.length) return null;
  return next.alliances[next.alliances.length - 1] ?? null;
}

/** Whether a newly formed Alliance should be surfaced to the given Player — only the two it pairs. */
export function isAllianceVisibleTo(
  alliance: Alliance,
  playerName: string,
): boolean {
  return (
    alliance.lootPlayerName === playerName ||
    alliance.winnerName === playerName
  );
}
