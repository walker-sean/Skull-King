import type { RoomState } from "./room.js";
import type { RejectionEvent } from "./events.js";

export interface CreateRoomRequest {
  hostName: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  displayName: string;
}

export type CommandResponse =
  | { ok: true; state: RoomState }
  | { ok: false; event: RejectionEvent };

export interface ServerToClientEvents {
  roomState: (state: RoomState) => void;
}

export interface ClientToServerEvents {
  createRoom: (request: CreateRoomRequest, callback: (response: CommandResponse) => void) => void;
  joinRoom: (request: JoinRoomRequest, callback: (response: CommandResponse) => void) => void;
}
