import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { openRoomStore, type RoomStore } from "@skull-king/persistence";
import type { ClientToServerEvents, CommandResponse, ServerToClientEvents } from "@skull-king/shared";
import { createRealtimeServer } from "./createRealtimeServer.js";

type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function connectClient(port: number): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket: Client = ioClient(`http://localhost:${port}`, { forceNew: true });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

function emit<Req>(
  socket: Client,
  event: "createRoom" | "joinRoom",
  request: Req,
): Promise<CommandResponse> {
  return new Promise((resolve) => {
    // @ts-expect-error -- event name is narrowed by caller
    socket.emit(event, request, resolve);
  });
}

describe("createRealtimeServer", () => {
  let dir: string;
  let dbPath: string;
  let store: RoomStore;
  let server: ReturnType<typeof createRealtimeServer>;
  let port: number;
  let clients: Client[];

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "skull-king-server-test-"));
    dbPath = join(dir, "rooms.sqlite");
    store = openRoomStore(dbPath);
    server = createRealtimeServer(store);
    clients = [];

    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, () => resolve());
    });
    port = (server.httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const client of clients) {
      client.disconnect();
    }
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function newClient(): Promise<Client> {
    const client = await connectClient(port);
    clients.push(client);
    return client;
  }

  it("creates a Room and returns a Lobby state with the host on the roster", async () => {
    const host = await newClient();

    const response = await emit(host, "createRoom", { hostName: "Alice" });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.status).toBe("Lobby");
    expect(response.state.players).toEqual([{ name: "Alice", isHost: true, connected: true }]);
    expect(response.state.roomCode).toHaveLength(4);
  });

  it("lets a second Player join by Room Code and broadcasts the updated roster live", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;

    const broadcastReceived = new Promise<unknown>((resolve) => {
      host.on("roomState", resolve);
    });

    const joiner = await newClient();
    const joinResponse = await emit(joiner, "joinRoom", { roomCode, displayName: "Bob" });

    expect(joinResponse.ok).toBe(true);
    if (!joinResponse.ok) throw new Error("expected success");
    expect(joinResponse.state.players).toEqual([
      { name: "Alice", isHost: true, connected: true },
      { name: "Bob", isHost: false, connected: true },
    ]);

    const broadcastState = await broadcastReceived;
    expect(broadcastState).toEqual(joinResponse.state);
  });

  it("rejects joining a Room Code that doesn't exist", async () => {
    const joiner = await newClient();

    const response = await emit(joiner, "joinRoom", { roomCode: "ZZZZ", displayName: "Bob" });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({ type: "JoinRejected", roomCode: "ZZZZ", reason: "RoomNotFound" });
  });

  it("rejects a display name already taken in the Room", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");

    const joiner = await newClient();
    const response = await emit(joiner, "joinRoom", {
      roomCode: created.state.roomCode,
      displayName: "Alice",
    });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "JoinRejected",
      roomCode: created.state.roomCode,
      reason: "NameTaken",
    });
  });

  it("persists Room state so it survives a server restart", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;

    for (const client of clients) client.disconnect();
    clients = [];
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    store.close();

    // Simulate a process restart: brand-new store and server bound to the same file.
    store = openRoomStore(dbPath);
    server = createRealtimeServer(store);
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, () => resolve());
    });
    port = (server.httpServer.address() as AddressInfo).port;

    const joiner = await newClient();
    const response = await emit(joiner, "joinRoom", { roomCode, displayName: "Bob" });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });
});
