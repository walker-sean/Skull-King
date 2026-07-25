import type { Card } from "./card.js";
import type { RoomState, ScoringMode } from "./room.js";
import type { RejectionEvent } from "./events.js";

export interface CreateRoomRequest {
  hostName: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  displayName: string;
}

export interface StartGameRequest {
  roomCode: string;
  scoringMode: ScoringMode;
}

export interface SubmitBidRequest {
  roomCode: string;
  bid: number;
}

export interface PlayCardRequest {
  roomCode: string;
  card: Card;
}

export type CommandResponse =
  { ok: true; state: RoomState } | { ok: false; event: RejectionEvent };

export interface ServerToClientEvents {
  roomState: (state: RoomState) => void;
}

export interface ClientToServerEvents {
  createRoom: (
    request: CreateRoomRequest,
    callback: (response: CommandResponse) => void,
  ) => void;
  joinRoom: (
    request: JoinRoomRequest,
    callback: (response: CommandResponse) => void,
  ) => void;
  startGame: (
    request: StartGameRequest,
    callback: (response: CommandResponse) => void,
  ) => void;
  submitBid: (
    request: SubmitBidRequest,
    callback: (response: CommandResponse) => void,
  ) => void;
  playCard: (
    request: PlayCardRequest,
    callback: (response: CommandResponse) => void,
  ) => void;
}
