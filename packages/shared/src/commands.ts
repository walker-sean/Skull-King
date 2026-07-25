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

export type Command = CreateRoomCommand | JoinRoomCommand;
