import { io, type Socket } from "socket.io-client";
import type {
  Card,
  ClientToServerEvents,
  CommandResponse,
  RoomState,
  ScoringMode,
  ServerToClientEvents,
} from "@skull-king/shared";

export interface SocketClient {
  createRoom(hostName: string): Promise<CommandResponse>;
  joinRoom(roomCode: string, displayName: string): Promise<CommandResponse>;
  startGame(
    roomCode: string,
    scoringMode: ScoringMode,
  ): Promise<CommandResponse>;
  submitBid(roomCode: string, bid: number): Promise<CommandResponse>;
  playCard(roomCode: string, card: Card): Promise<CommandResponse>;
  onRoomState(handler: (state: RoomState) => void): () => void;
  disconnect(): void;
}

export function createSocketClient(url: string): SocketClient {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url);

  return {
    createRoom(hostName: string): Promise<CommandResponse> {
      return new Promise((resolve) => {
        socket.emit("createRoom", { hostName }, resolve);
      });
    },

    joinRoom(roomCode: string, displayName: string): Promise<CommandResponse> {
      return new Promise((resolve) => {
        socket.emit("joinRoom", { roomCode, displayName }, resolve);
      });
    },

    startGame(
      roomCode: string,
      scoringMode: ScoringMode,
    ): Promise<CommandResponse> {
      return new Promise((resolve) => {
        socket.emit("startGame", { roomCode, scoringMode }, resolve);
      });
    },

    submitBid(roomCode: string, bid: number): Promise<CommandResponse> {
      return new Promise((resolve) => {
        socket.emit("submitBid", { roomCode, bid }, resolve);
      });
    },

    playCard(roomCode: string, card: Card): Promise<CommandResponse> {
      return new Promise((resolve) => {
        socket.emit("playCard", { roomCode, card }, resolve);
      });
    },

    onRoomState(handler: (state: RoomState) => void): () => void {
      socket.on("roomState", handler);
      return () => socket.off("roomState", handler);
    },

    disconnect(): void {
      socket.disconnect();
    },
  };
}
