export type JoinRejectedReason = "RoomNotFound" | "NameTaken" | "RoomNotInLobby" | "InvalidName";

export interface RoomCreatedEvent {
  type: "RoomCreated";
  roomCode: string;
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

export type DomainEvent =
  | RoomCreatedEvent
  | RoomCreateRejectedEvent
  | PlayerJoinedEvent
  | JoinRejectedEvent;

export type RejectionEvent = RoomCreateRejectedEvent | JoinRejectedEvent;
