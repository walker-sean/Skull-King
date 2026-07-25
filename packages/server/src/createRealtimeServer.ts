import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import { createRoom, generateRoomCode, joinRoom, startGame } from "@skull-king/engine";
import type { RoomStore } from "@skull-king/persistence";
import type {
  ClientToServerEvents,
  DomainEvent,
  RejectionEvent,
  RoomState,
  ServerToClientEvents,
} from "@skull-king/shared";
import { redactHandsFor } from "./redactRoomState.js";

export interface RealtimeServer {
  httpServer: HttpServer;
  io: SocketIoServer<ClientToServerEvents, ServerToClientEvents>;
}

/**
 * Binds a socket to the Player it created/joined as, since the wire protocol has no accounts
 * (see docs/adr/0002-no-accounts-reconnect-by-name.md). Commands that need to authorize the
 * caller (e.g. only the Host may start the Game) read the actor's name from here rather than
 * trusting a client-supplied field.
 */
interface SocketSession {
  roomCode: string;
  playerName: string;
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

  // Keyed by socket id so a broadcast to a whole Room can look up which Player
  // each destination socket is bound to and redact that viewer's Room state.
  const sessionsBySocketId = new Map<string, SocketSession>();

  async function broadcastRoomState(roomCode: string, state: RoomState): Promise<void> {
    const sockets = await io.in(roomCode).fetchSockets();
    for (const destination of sockets) {
      const destinationSession = sessionsBySocketId.get(destination.id);
      const viewerName =
        destinationSession !== undefined && destinationSession.roomCode === roomCode
          ? destinationSession.playerName
          : null;
      destination.emit("roomState", redactHandsFor(state, viewerName));
    }
  }

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
      const roomCreated = result.events.find((event) => event.type === "RoomCreated");
      if (roomCreated !== undefined) {
        sessionsBySocketId.set(socket.id, {
          roomCode: result.state.roomCode,
          playerName: roomCreated.hostName,
        });
      }
      callback({ ok: true, state: redactHandsFor(result.state, roomCreated?.hostName ?? null) });
      void broadcastRoomState(result.state.roomCode, result.state);
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
      const playerJoined = result.events.find((event) => event.type === "PlayerJoined");
      if (playerJoined !== undefined) {
        sessionsBySocketId.set(socket.id, {
          roomCode: normalizedCode,
          playerName: playerJoined.playerName,
        });
      }
      callback({ ok: true, state: redactHandsFor(result.state, playerJoined?.playerName ?? null) });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("startGame", ({ roomCode, scoringMode }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const session = sessionsBySocketId.get(socket.id);
      const actorName = session !== undefined && session.roomCode === normalizedCode ? session.playerName : null;
      const result = startGame(state, {
        type: "StartGame",
        roomCode: normalizedCode,
        scoringMode,
        actorName,
      });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      callback({ ok: true, state: redactHandsFor(result.state, actorName) });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("disconnect", () => {
      sessionsBySocketId.delete(socket.id);
    });
  });

  return { httpServer, io };
}
