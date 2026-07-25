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

export type Command =
  | CreateRoomCommand
  | JoinRoomCommand
  | StartGameCommand
  | SubmitBidCommand
  | PlayCardCommand;
