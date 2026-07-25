import type { Card } from "./card.js";
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

export type PlayCardRejectedReason =
  | "RoomNotFound"
  | "RoomNotActive"
  | "PlayerNotFound"
  | "BiddingIncomplete"
  | "NotYourTurn"
  | "CardNotInHand"
  | "MustFollowSuit"
  | "InvalidTigressDeclaration";

export interface CardPlayedEvent {
  type: "CardPlayed";
  roomCode: string;
  playerName: string;
  card: Card;
}

export interface TrickWonEvent {
  type: "TrickWon";
  roomCode: string;
  winnerName: string;
}

export interface PlayCardRejectedEvent {
  type: "PlayCardRejected";
  roomCode: string;
  reason: PlayCardRejectedReason;
}

export type DomainEvent =
  | RoomCreatedEvent
  | RoomCreateRejectedEvent
  | PlayerJoinedEvent
  | JoinRejectedEvent
  | GameStartedEvent
  | StartGameRejectedEvent
  | BidSubmittedEvent
  | SubmitBidRejectedEvent
  | CardPlayedEvent
  | TrickWonEvent
  | PlayCardRejectedEvent;

export type RejectionEvent =
  | RoomCreateRejectedEvent
  | JoinRejectedEvent
  | StartGameRejectedEvent
  | SubmitBidRejectedEvent
  | PlayCardRejectedEvent;
