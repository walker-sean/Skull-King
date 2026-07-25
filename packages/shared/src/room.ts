export type RoomStatus = "Lobby" | "Active" | "Paused" | "Completed";

export interface Player {
  name: string;
  isHost: boolean;
  connected: boolean;
}

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  players: Player[];
}
