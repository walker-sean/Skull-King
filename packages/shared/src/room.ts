import type { Card } from "./card.js";

export type RoomStatus = "Lobby" | "Active" | "Paused" | "Completed";

export type ScoringMode = "Traditional" | "Rascal";

export const MIN_PLAYERS_TO_START = 3;
export const MAX_PLAYERS_TO_START = 8;

export interface Player {
  name: string;
  isHost: boolean;
  connected: boolean;
  /** This Player's dealt cards for the current Round; empty before dealing happens. */
  hand: Card[];
}

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  players: Player[];
  /** Locked in by the Host when starting the Game; null while the Room is still in Lobby. */
  scoringMode: ScoringMode | null;
  /** The Round number in progress (1-10); null while the Room is still in Lobby. */
  currentRound: number | null;
}
