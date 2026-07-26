import type { Card } from "./card.js";
import type { ScoringMode } from "./room.js";

export interface CreateRoomCommand {
  type: "CreateRoom";
  roomCode: string;
  hostName: string;
}

export interface JoinRoomCommand {
  type: "JoinRoom";
  roomCode: string;
  displayName: string;
}

export interface StartGameCommand {
  type: "StartGame";
  roomCode: string;
  scoringMode: ScoringMode;
  /** The Player name bound to the caller's socket session; null if the socket never joined/created a Room. */
  actorName: string | null;
}

export interface SubmitBidCommand {
  type: "SubmitBid";
  roomCode: string;
  bid: number;
  /** The Player name bound to the caller's socket session; null if the socket never joined/created a Room. */
  actorName: string | null;
}

export interface PlayCardCommand {
  type: "PlayCard";
  roomCode: string;
  card: Card;
  /** The Player name bound to the caller's socket session; null if the socket never joined/created a Room. */
  actorName: string | null;
}

/**
 * The choice a Player makes when invoking their unlocked Advanced Pirate Ability (see
 * CONTEXT.md's Advanced Pirate Ability entry), one variant per named Pirate.
 */
export type PirateAbilityEffect =
  | { pirateName: "RosieDLaney"; chosenLeaderName: string }
  | { pirateName: "HarryTheGiant"; bidAdjustment: -1 | 0 | 1 }
  | { pirateName: "BendtTheBandit"; discard: [Card, Card] }
  | { pirateName: "RascalOfRoatan"; bet: 0 | 10 | 20 }
  | { pirateName: "JuanitaJade" };

export interface InvokePirateAbilityCommand {
  type: "InvokePirateAbility";
  roomCode: string;
  effect: PirateAbilityEffect;
  /** The Player name bound to the caller's socket session; null if the socket never joined/created a Room. */
  actorName: string | null;
}

/**
 * Server-internal: raised when a Player's socket disconnects. Not part of the wire
 * protocol — a Player can't ask to be disconnected, the server detects it — but modeled
 * as a command so the transition it causes (pausing the Room) is pure, engine-level, and
 * testable like every other state change.
 */
export interface DisconnectCommand {
  type: "Disconnect";
  roomCode: string;
  playerName: string;
}

export type Command =
  | CreateRoomCommand
  | JoinRoomCommand
  | StartGameCommand
  | SubmitBidCommand
  | PlayCardCommand
  | InvokePirateAbilityCommand
  | DisconnectCommand;
