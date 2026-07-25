import type { ScoringMode } from "./room.js";

export type JoinRejectedReason = "RoomNotFound" | "NameTaken" | "RoomNotInLobby" | "InvalidName";

export type StartGameRejectedReason =
  | "RoomNotFound"
  | "NotHost"
  | "TooFewPlayers"
  | "TooManyPlayers"
  | "RoomNotInLobby";

export interface RoomCreatedEvent {
  type: "RoomCreated";
  roomCode: string;
  hostName: string;
}

export interface RoomCreateRejectedEvent {
  type: "RoomCreateRejected";
  reason: "InvalidName";
}

export interface PlayerJoinedEvent {
  type: "PlayerJoined";
  roomCode: string;
  playerName: string;
}

export interface JoinRejectedEvent {
  type: "JoinRejected";
  roomCode: string;
  reason: JoinRejectedReason;
}

export interface GameStartedEvent {
  type: "GameStarted";
  roomCode: string;
  scoringMode: ScoringMode;
}

export interface StartGameRejectedEvent {
  type: "StartGameRejected";
  roomCode: string;
  reason: StartGameRejectedReason;
}

export type SubmitBidRejectedReason =
  | "RoomNotFound"
  | "RoomNotActive"
  | "PlayerNotFound"
  | "AlreadyBid"
  | "InvalidBid";

export interface BidSubmittedEvent {
  type: "BidSubmitted";
  roomCode: string;
  playerName: string;
}

export interface SubmitBidRejectedEvent {
  type: "SubmitBidRejected";
  roomCode: string;
  reason: SubmitBidRejectedReason;
}

export type DomainEvent =
  | RoomCreatedEvent
  | RoomCreateRejectedEvent
  | PlayerJoinedEvent
  | JoinRejectedEvent
  | GameStartedEvent
  | StartGameRejectedEvent
  | BidSubmittedEvent
  | SubmitBidRejectedEvent;

export type RejectionEvent =
  | RoomCreateRejectedEvent
  | JoinRejectedEvent
  | StartGameRejectedEvent
  | SubmitBidRejectedEvent;
