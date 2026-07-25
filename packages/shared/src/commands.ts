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
}

export type Command = CreateRoomCommand | JoinRoomCommand | StartGameCommand;
