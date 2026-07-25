import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { openRoomStore, type RoomStore } from "@skull-king/persistence";
import type {
  Card,
  ClientToServerEvents,
  CommandResponse,
  RoomState,
  ServerToClientEvents,
} from "@skull-king/shared";
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
  event: "createRoom" | "joinRoom" | "startGame" | "submitBid" | "playCard",
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
    expect(response.state.players).toEqual([
      { name: "Alice", isHost: true, connected: true, hand: [], bid: null },
    ]);
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
      { name: "Alice", isHost: true, connected: true, hand: [], bid: null },
      { name: "Bob", isHost: false, connected: true, hand: [], bid: null },
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

  it("starts the Game once 3 Players have joined, locking in the Scoring Mode and broadcasting Active status", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Bob" });
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Carol" });

    const broadcastReceived = new Promise<unknown>((resolve) => {
      host.on("roomState", (state) => {
        if (state.status === "Active") resolve(state);
      });
    });

    const response = await emit(host, "startGame", { roomCode, scoringMode: "Traditional" });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.status).toBe("Active");
    expect(response.state.scoringMode).toBe("Traditional");
    expect(await broadcastReceived).toEqual(response.state);
  });

  it("deals Round 1 on start, showing each Player only their own hand while the Round number is visible to all", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    const bob = await newClient();
    await emit(bob, "joinRoom", { roomCode, displayName: "Bob" });
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Carol" });

    const bobStateReceived = new Promise<RoomState>((resolve) => {
      bob.on("roomState", (state) => {
        if (state.status === "Active") resolve(state);
      });
    });

    const response = await emit(host, "startGame", { roomCode, scoringMode: "Traditional" });
    if (!response.ok) throw new Error("expected success");

    expect(response.state.currentRound).toBe(1);
    const hostView = response.state.players;
    expect(hostView.find((p) => p.name === "Alice")?.hand).toHaveLength(1);
    expect(hostView.find((p) => p.name === "Bob")?.hand).toHaveLength(0);
    expect(hostView.find((p) => p.name === "Carol")?.hand).toHaveLength(0);

    const bobState = await bobStateReceived;
    expect(bobState.currentRound).toBe(1);
    expect(bobState.players.find((p) => p.name === "Bob")?.hand).toHaveLength(1);
    expect(bobState.players.find((p) => p.name === "Alice")?.hand).toHaveLength(0);
    expect(bobState.players.find((p) => p.name === "Carol")?.hand).toHaveLength(0);
  });

  it("rejects starting the Game with fewer than 3 Players", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");

    const response = await emit(host, "startGame", {
      roomCode: created.state.roomCode,
      scoringMode: "Traditional",
    });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "StartGameRejected",
      roomCode: created.state.roomCode,
      reason: "TooFewPlayers",
    });
  });

  it("rejects starting the Game a second time once it is already Active", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Bob" });
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Carol" });
    await emit(host, "startGame", { roomCode, scoringMode: "Traditional" });

    const response = await emit(host, "startGame", { roomCode, scoringMode: "Rascal" });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "StartGameRejected",
      roomCode,
      reason: "RoomNotInLobby",
    });
  });

  it("rejects starting the Game from a Player socket that is not the Host", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    const joiner = await newClient();
    await emit(joiner, "joinRoom", { roomCode, displayName: "Bob" });
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Carol" });

    const response = await emit(joiner, "startGame", { roomCode, scoringMode: "Traditional" });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "StartGameRejected",
      roomCode,
      reason: "NotHost",
    });
  });

  it("rejects starting the Game from a socket that never created or joined the Room", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Bob" });
    await emit(await newClient(), "joinRoom", { roomCode, displayName: "Carol" });

    const stranger = await newClient();
    const response = await emit(stranger, "startGame", { roomCode, scoringMode: "Traditional" });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "StartGameRejected",
      roomCode,
      reason: "NotHost",
    });
  });

  async function startedRoomOf3(): Promise<{ host: Client; bob: Client; carol: Client; roomCode: string }> {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;
    const bob = await newClient();
    await emit(bob, "joinRoom", { roomCode, displayName: "Bob" });
    const carol = await newClient();
    await emit(carol, "joinRoom", { roomCode, displayName: "Carol" });
    await emit(host, "startGame", { roomCode, scoringMode: "Traditional" });
    return { host, bob, carol, roomCode };
  }

  it("keeps a submitted Bid hidden from other Players until everyone has bid, then reveals all at once", async () => {
    const { host, bob, carol, roomCode } = await startedRoomOf3();

    const aliceResponse = await emit(host, "submitBid", { roomCode, bid: 1 });
    expect(aliceResponse.ok).toBe(true);
    if (!aliceResponse.ok) throw new Error("expected success");
    expect(aliceResponse.state.players.find((p) => p.name === "Alice")?.bid).toBe(1);

    const bobResponse = await emit(bob, "submitBid", { roomCode, bid: 0 });
    expect(bobResponse.ok).toBe(true);
    if (!bobResponse.ok) throw new Error("expected success");
    expect(bobResponse.state.players.find((p) => p.name === "Alice")?.bid).toBeNull();
    expect(bobResponse.state.players.find((p) => p.name === "Bob")?.bid).toBe(0);

    const hostSeesReveal = new Promise<RoomState>((resolve) => {
      host.on("roomState", (state) => {
        if (state.players.every((p) => p.bid !== null)) resolve(state);
      });
    });
    const carolResponse = await emit(carol, "submitBid", { roomCode, bid: 1 });
    expect(carolResponse.ok).toBe(true);
    if (!carolResponse.ok) throw new Error("expected success");
    expect(carolResponse.state.players.find((p) => p.name === "Alice")?.bid).toBe(1);
    expect(carolResponse.state.players.find((p) => p.name === "Bob")?.bid).toBe(0);
    expect(carolResponse.state.players.find((p) => p.name === "Carol")?.bid).toBe(1);

    const hostRevealedState = await hostSeesReveal;
    expect(hostRevealedState.players.find((p) => p.name === "Bob")?.bid).toBe(0);
    expect(hostRevealedState.players.find((p) => p.name === "Carol")?.bid).toBe(1);
  });

  it("rejects a second Bid from the same Player, leaving their original Bid intact", async () => {
    const { host, roomCode } = await startedRoomOf3();
    await emit(host, "submitBid", { roomCode, bid: 1 });

    const response = await emit(host, "submitBid", { roomCode, bid: 0 });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({ type: "SubmitBidRejected", roomCode, reason: "AlreadyBid" });
  });

  it("rejects a Bid from a socket that never joined the Room", async () => {
    const { roomCode } = await startedRoomOf3();
    const stranger = await newClient();

    const response = await emit(stranger, "submitBid", { roomCode, bid: 1 });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "SubmitBidRejected",
      roomCode,
      reason: "PlayerNotFound",
    });
  });

  async function playableRoomOf3(): Promise<{
    host: Client;
    bob: Client;
    carol: Client;
    roomCode: string;
    hands: Record<"Alice" | "Bob" | "Carol", Card>;
  }> {
    const { host, bob, carol, roomCode } = await startedRoomOf3();
    const aliceResponse = await emit(host, "submitBid", { roomCode, bid: 0 });
    const bobResponse = await emit(bob, "submitBid", { roomCode, bid: 0 });
    const carolResponse = await emit(carol, "submitBid", { roomCode, bid: 0 });
    if (!aliceResponse.ok || !bobResponse.ok || !carolResponse.ok) {
      throw new Error("expected successful Bids");
    }

    const aliceCard = aliceResponse.state.players.find((p) => p.name === "Alice")?.hand[0];
    const bobCard = bobResponse.state.players.find((p) => p.name === "Bob")?.hand[0];
    const carolCard = carolResponse.state.players.find((p) => p.name === "Carol")?.hand[0];
    if (!aliceCard || !bobCard || !carolCard) throw new Error("expected dealt cards");

    return { host, bob, carol, roomCode, hands: { Alice: aliceCard, Bob: bobCard, Carol: carolCard } };
  }

  it("rejects a play from a Player before their turn", async () => {
    const { bob, roomCode, hands } = await playableRoomOf3();

    const response = await emit(bob, "playCard", { roomCode, card: hands.Bob });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({ type: "PlayCardRejected", roomCode, reason: "NotYourTurn" });
  });

  it("lets every Player see cards played into the current Trick, in play order", async () => {
    const { host, carol, roomCode, hands } = await playableRoomOf3();

    const carolSeesThePlay = new Promise<RoomState>((resolve) => {
      carol.on("roomState", (state) => {
        if ((state.currentTrick?.length ?? 0) === 1) resolve(state);
      });
    });

    const aliceResponse = await emit(host, "playCard", { roomCode, card: hands.Alice });
    expect(aliceResponse.ok).toBe(true);

    const carolState = await carolSeesThePlay;
    expect(carolState.currentTrick).toEqual([{ playerName: "Alice", card: hands.Alice }]);
  });

  it("has the Trick's winner lead the next Trick, once every Player has played", async () => {
    const { host, bob, carol, roomCode, hands } = await playableRoomOf3();

    await emit(host, "playCard", { roomCode, card: hands.Alice });
    await emit(bob, "playCard", { roomCode, card: hands.Bob });
    const response = await emit(carol, "playCard", { roomCode, card: hands.Carol });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.currentTrick).toEqual([]);
    expect(["Alice", "Bob", "Carol"]).toContain(response.state.trickLeader);
  });
});
