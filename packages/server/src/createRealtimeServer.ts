import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import { createRoom, generateRoomCode, joinRoom, startGame } from "@skull-king/engine";
import type { RoomStore } from "@skull-king/persistence";
import type {
  ClientToServerEvents,
  DomainEvent,
  RejectionEvent,
  ServerToClientEvents,
} from "@skull-king/shared";

export interface RealtimeServer {
  httpServer: HttpServer;
  io: SocketIoServer<ClientToServerEvents, ServerToClientEvents>;
}

function isRejectionEvent(event: DomainEvent): event is RejectionEvent {
  return (
    event.type === "RoomCreateRejected" ||
    event.type === "JoinRejected" ||
    event.type === "StartGameRejected"
  );
}

function firstRejection(events: DomainEvent[]): RejectionEvent {
  const rejection = events.find(isRejectionEvent);
  if (!rejection) {
    throw new Error("Expected a rejection event but found none");
  }
  return rejection;
}

export function createRealtimeServer(store: RoomStore): RealtimeServer {
  const httpServer = createServer();
  const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("createRoom", ({ hostName }, callback) => {
      const existingCodes = new Set(store.listNonCompletedRoomCodes());
      const roomCode = generateRoomCode(existingCodes);
      const result = createRoom({ type: "CreateRoom", roomCode, hostName });

      if (result.state === null) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      void socket.join(result.state.roomCode);
      callback({ ok: true, state: result.state });
      io.to(result.state.roomCode).emit("roomState", result.state);
    });

    socket.on("joinRoom", ({ roomCode, displayName }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const result = joinRoom(state, { type: "JoinRoom", roomCode: normalizedCode, displayName });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      void socket.join(normalizedCode);
      callback({ ok: true, state: result.state });
      io.to(normalizedCode).emit("roomState", result.state);
    });

    socket.on("startGame", ({ roomCode, scoringMode }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const result = startGame(state, { type: "StartGame", roomCode: normalizedCode, scoringMode });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      callback({ ok: true, state: result.state });
      io.to(normalizedCode).emit("roomState", result.state);
    });
  });

  return { httpServer, io };
}
