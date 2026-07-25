import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import {
  createRoom,
  disconnectPlayer,
  generateRoomCode,
  joinRoom,
  playCard,
  startGame,
  submitBid,
} from "@skull-king/engine";
import type { RoomStore } from "@skull-king/persistence";
import type {
  ClientToServerEvents,
  DomainEvent,
  RejectionEvent,
  RoomState,
  ServerToClientEvents,
} from "@skull-king/shared";
import { redactRoomStateFor } from "./redactRoomState.js";

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
    event.type === "StartGameRejected" ||
    event.type === "SubmitBidRejected" ||
    event.type === "PlayCardRejected"
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
  const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: { origin: "*" },
    },
  );

  // Keyed by socket id so a broadcast to a whole Room can look up which Player
  // each destination socket is bound to and redact that viewer's Room state.
  const sessionsBySocketId = new Map<string, SocketSession>();

  async function broadcastRoomState(
    roomCode: string,
    state: RoomState,
  ): Promise<void> {
    const sockets = await io.in(roomCode).fetchSockets();
    for (const destination of sockets) {
      const destinationSession = sessionsBySocketId.get(destination.id);
      const viewerName =
        destinationSession !== undefined &&
        destinationSession.roomCode === roomCode
          ? destinationSession.playerName
          : null;
      destination.emit("roomState", redactRoomStateFor(state, viewerName));
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
      const roomCreated = result.events.find(
        (event) => event.type === "RoomCreated",
      );
      if (roomCreated !== undefined) {
        sessionsBySocketId.set(socket.id, {
          roomCode: result.state.roomCode,
          playerName: roomCreated.hostName,
        });
      }
      callback({
        ok: true,
        state: redactRoomStateFor(result.state, roomCreated?.hostName ?? null),
      });
      void broadcastRoomState(result.state.roomCode, result.state);
    });

    socket.on("joinRoom", ({ roomCode, displayName }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const result = joinRoom(state, {
        type: "JoinRoom",
        roomCode: normalizedCode,
        displayName,
      });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      void socket.join(normalizedCode);
      // Either a brand-new join or a reconnect to an existing seat (see joinRoom.ts) —
      // both bind this socket to the same Player identity.
      const identityEvent = result.events.find(
        (event): event is typeof event & { playerName: string } =>
          event.type === "PlayerJoined" || event.type === "PlayerReconnected",
      );
      const playerName = identityEvent?.playerName ?? null;
      if (playerName !== null) {
        sessionsBySocketId.set(socket.id, {
          roomCode: normalizedCode,
          playerName,
        });
      }
      callback({
        ok: true,
        state: redactRoomStateFor(result.state, playerName),
      });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("startGame", ({ roomCode, scoringMode }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const session = sessionsBySocketId.get(socket.id);
      const actorName =
        session !== undefined && session.roomCode === normalizedCode
          ? session.playerName
          : null;
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
      callback({
        ok: true,
        state: redactRoomStateFor(result.state, actorName),
      });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("submitBid", ({ roomCode, bid }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const session = sessionsBySocketId.get(socket.id);
      const actorName =
        session !== undefined && session.roomCode === normalizedCode
          ? session.playerName
          : null;
      const result = submitBid(state, {
        type: "SubmitBid",
        roomCode: normalizedCode,
        bid,
        actorName,
      });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      callback({
        ok: true,
        state: redactRoomStateFor(result.state, actorName),
      });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("playCard", ({ roomCode, card }, callback) => {
      const normalizedCode = roomCode.trim().toUpperCase();
      const state = store.loadRoom(normalizedCode);
      const session = sessionsBySocketId.get(socket.id);
      const actorName =
        session !== undefined && session.roomCode === normalizedCode
          ? session.playerName
          : null;
      const result = playCard(state, {
        type: "PlayCard",
        roomCode: normalizedCode,
        card,
        actorName,
      });

      if (result.state === null || result.events.some(isRejectionEvent)) {
        callback({ ok: false, event: firstRejection(result.events) });
        return;
      }

      store.saveRoom(result.state);
      callback({
        ok: true,
        state: redactRoomStateFor(result.state, actorName),
      });
      void broadcastRoomState(normalizedCode, result.state);
    });

    socket.on("disconnect", () => {
      const session = sessionsBySocketId.get(socket.id);
      sessionsBySocketId.delete(socket.id);
      if (session === undefined) return;

      const state = store.loadRoom(session.roomCode);
      const result = disconnectPlayer(state, {
        type: "Disconnect",
        roomCode: session.roomCode,
        playerName: session.playerName,
      });

      if (result.state === null) return;
      store.saveRoom(result.state);
      void broadcastRoomState(session.roomCode, result.state);
    });
  });

  return { httpServer, io };
}
