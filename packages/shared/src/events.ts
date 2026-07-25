import type { Card } from "./card.js";
import type { ScoringMode } from "./room.js";

export type JoinRejectedReason =
  | "RoomNotFound"
  | "NameTaken"
  | "RoomNotInLobby"
  | "InvalidName"
  | "AlreadyConnected";

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

/**
 * Raised instead of PlayerJoined when the joining name matches an existing, disconnected
 * Player in an Active or Paused Room: they're resuming their seat (see
 * docs/adr/0002-no-accounts-reconnect-by-name.md), not joining as a new roster entry.
 */
export interface PlayerReconnectedEvent {
  type: "PlayerReconnected";
  roomCode: string;
  playerName: string;
}

export interface PlayerDisconnectedEvent {
  type: "PlayerDisconnected";
  roomCode: string;
  playerName: string;
}

/** Raised alongside PlayerDisconnected when the disconnect causes an Active Room to pause. */
export interface RoomPausedEvent {
  type: "RoomPaused";
  roomCode: string;
}

/** Raised alongside PlayerReconnected when the reconnect brings every roster Player back. */
export interface RoomResumedEvent {
  type: "RoomResumed";
  roomCode: string;
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

/** Raised alongside TrickWon whenever a Loot card in that Trick formed a new Alliance. */
export interface AllianceFormedEvent {
  type: "AllianceFormed";
  roomCode: string;
  lootPlayerName: string;
  winnerName: string;
}

/** The Advanced Card whose Trick-level effect (see CONTEXT.md) applied to a voided Trick. */
export type TrickVoidingCard = "Kraken" | "WhiteWhale";

/**
 * Raised instead of TrickWon when a Kraken, or a White Whale with no Suited cards played,
 * voids the Trick: no one wins it, and whoever would have won leads the next Trick instead
 * (see CONTEXT.md's Kraken and White Whale entries).
 */
export interface TrickVoidedEvent {
  type: "TrickVoided";
  roomCode: string;
  voidedBy: TrickVoidingCard;
  nextLeaderName: string;
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
  | AllianceFormedEvent
  | TrickVoidedEvent
  | PlayCardRejectedEvent
  | PlayerReconnectedEvent
  | PlayerDisconnectedEvent
  | RoomPausedEvent
  | RoomResumedEvent;

export type RejectionEvent =
  | RoomCreateRejectedEvent
  | JoinRejectedEvent
  | StartGameRejectedEvent
  | SubmitBidRejectedEvent
  | PlayCardRejectedEvent;
