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
  Suit,
} from "@skull-king/shared";
import { createRealtimeServer } from "./createRealtimeServer.js";

type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function connectClient(port: number): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket: Client = ioClient(`http://localhost:${port}`, {
      forceNew: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

function emit<Req>(
  socket: Client,
  event:
    | "createRoom"
    | "joinRoom"
    | "startGame"
    | "submitBid"
    | "playCard"
    | "invokePirateAbility",
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
      {
        name: "Alice",
        isHost: true,
        connected: true,
        hand: [],
        bid: null,
        hasBid: false,
        tricksWon: 0,
        score: 0,
      },
    ]);
    expect(response.state.roomCode).toHaveLength(4);
  });

  it("lets a second Player join by Room Code and broadcasts the updated roster live", async () => {
    const host = await newClient();
    const created = await emit(host, "createRoom", { hostName: "Alice" });
    if (!created.ok) throw new Error("expected success");
    const { roomCode } = created.state;

    const broadcastReceived = new Promise<RoomState>((resolve) => {
      host.on("roomState", (state) => {
        if (state.players.some((p) => p.name === "Bob")) resolve(state);
      });
    });

    const joiner = await newClient();
    const joinResponse = await emit(joiner, "joinRoom", {
      roomCode,
      displayName: "Bob",
    });

    expect(joinResponse.ok).toBe(true);
    if (!joinResponse.ok) throw new Error("expected success");
    expect(joinResponse.state.players).toEqual([
      {
        name: "Alice",
        isHost: true,
        connected: true,
        hand: [],
        bid: null,
        hasBid: false,
        tricksWon: 0,
        score: 0,
      },
      {
        name: "Bob",
        isHost: false,
        connected: true,
        hand: [],
        bid: null,
        hasBid: false,
        tricksWon: 0,
        score: 0,
      },
    ]);

    const broadcastState = await broadcastReceived;
    expect(broadcastState).toEqual(joinResponse.state);
  });

  it("rejects joining a Room Code that doesn't exist", async () => {
    const joiner = await newClient();

    const response = await emit(joiner, "joinRoom", {
      roomCode: "ZZZZ",
      displayName: "Bob",
    });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "JoinRejected",
      roomCode: "ZZZZ",
      reason: "RoomNotFound",
    });
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
    const response = await emit(joiner, "joinRoom", {
      roomCode,
      displayName: "Bob",
    });

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
    await emit(await newClient(), "joinRoom", {
      roomCode,
      displayName: "Carol",
    });

    const broadcastReceived = new Promise<unknown>((resolve) => {
      host.on("roomState", (state) => {
        if (state.status === "Active") resolve(state);
      });
    });

    const response = await emit(host, "startGame", {
      roomCode,
      scoringMode: "Traditional",
    });

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
    await emit(await newClient(), "joinRoom", {
      roomCode,
      displayName: "Carol",
    });

    const bobStateReceived = new Promise<RoomState>((resolve) => {
      bob.on("roomState", (state) => {
        if (state.status === "Active") resolve(state);
      });
    });

    const response = await emit(host, "startGame", {
      roomCode,
      scoringMode: "Traditional",
    });
    if (!response.ok) throw new Error("expected success");

    expect(response.state.currentRound).toBe(1);
    const hostView = response.state.players;
    expect(hostView.find((p) => p.name === "Alice")?.hand).toHaveLength(1);
    expect(hostView.find((p) => p.name === "Bob")?.hand).toHaveLength(0);
    expect(hostView.find((p) => p.name === "Carol")?.hand).toHaveLength(0);

    const bobState = await bobStateReceived;
    expect(bobState.currentRound).toBe(1);
    expect(bobState.players.find((p) => p.name === "Bob")?.hand).toHaveLength(
      1,
    );
    expect(bobState.players.find((p) => p.name === "Alice")?.hand).toHaveLength(
      0,
    );
    expect(bobState.players.find((p) => p.name === "Carol")?.hand).toHaveLength(
      0,
    );
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
    await emit(await newClient(), "joinRoom", {
      roomCode,
      displayName: "Carol",
    });
    await emit(host, "startGame", { roomCode, scoringMode: "Traditional" });

    const response = await emit(host, "startGame", {
      roomCode,
      scoringMode: "Rascal",
    });

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
    await emit(await newClient(), "joinRoom", {
      roomCode,
      displayName: "Carol",
    });

    const response = await emit(joiner, "startGame", {
      roomCode,
      scoringMode: "Traditional",
    });

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
    await emit(await newClient(), "joinRoom", {
      roomCode,
      displayName: "Carol",
    });

    const stranger = await newClient();
    const response = await emit(stranger, "startGame", {
      roomCode,
      scoringMode: "Traditional",
    });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "StartGameRejected",
      roomCode,
      reason: "NotHost",
    });
  });

  async function startedRoomOf3(): Promise<{
    host: Client;
    bob: Client;
    carol: Client;
    roomCode: string;
  }> {
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
    expect(
      aliceResponse.state.players.find((p) => p.name === "Alice")?.bid,
    ).toBe(1);

    const bobResponse = await emit(bob, "submitBid", { roomCode, bid: 0 });
    expect(bobResponse.ok).toBe(true);
    if (!bobResponse.ok) throw new Error("expected success");
    expect(
      bobResponse.state.players.find((p) => p.name === "Alice")?.bid,
    ).toBeNull();
    expect(bobResponse.state.players.find((p) => p.name === "Bob")?.bid).toBe(
      0,
    );

    const hostSeesReveal = new Promise<RoomState>((resolve) => {
      host.on("roomState", (state) => {
        if (state.players.every((p) => p.bid !== null)) resolve(state);
      });
    });
    const carolResponse = await emit(carol, "submitBid", { roomCode, bid: 1 });
    expect(carolResponse.ok).toBe(true);
    if (!carolResponse.ok) throw new Error("expected success");
    expect(
      carolResponse.state.players.find((p) => p.name === "Alice")?.bid,
    ).toBe(1);
    expect(carolResponse.state.players.find((p) => p.name === "Bob")?.bid).toBe(
      0,
    );
    expect(
      carolResponse.state.players.find((p) => p.name === "Carol")?.bid,
    ).toBe(1);

    const hostRevealedState = await hostSeesReveal;
    expect(hostRevealedState.players.find((p) => p.name === "Bob")?.bid).toBe(
      0,
    );
    expect(hostRevealedState.players.find((p) => p.name === "Carol")?.bid).toBe(
      1,
    );
  });

  it("rejects a second Bid from the same Player, leaving their original Bid intact", async () => {
    const { host, roomCode } = await startedRoomOf3();
    await emit(host, "submitBid", { roomCode, bid: 1 });

    const response = await emit(host, "submitBid", { roomCode, bid: 0 });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "SubmitBidRejected",
      roomCode,
      reason: "AlreadyBid",
    });
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
    fullHands: Record<"Alice" | "Bob" | "Carol", Card[]>;
  }> {
    const { host, bob, carol, roomCode } = await startedRoomOf3();
    const aliceResponse = await emit(host, "submitBid", { roomCode, bid: 0 });
    const bobResponse = await emit(bob, "submitBid", { roomCode, bid: 0 });
    const carolResponse = await emit(carol, "submitBid", { roomCode, bid: 0 });
    if (!aliceResponse.ok || !bobResponse.ok || !carolResponse.ok) {
      throw new Error("expected successful Bids");
    }

    const aliceHand = aliceResponse.state.players.find(
      (p) => p.name === "Alice",
    )?.hand;
    const bobHand = bobResponse.state.players.find(
      (p) => p.name === "Bob",
    )?.hand;
    const carolHand = carolResponse.state.players.find(
      (p) => p.name === "Carol",
    )?.hand;
    if (!aliceHand || !bobHand || !carolHand)
      throw new Error("expected dealt cards");

    return {
      host,
      bob,
      carol,
      roomCode,
      hands: {
        Alice: toPlayable(aliceHand[0]!),
        Bob: toPlayable(bobHand[0]!),
        Carol: toPlayable(carolHand[0]!),
      },
      fullHands: {
        Alice: aliceHand.map(toPlayable),
        Bob: bobHand.map(toPlayable),
        Carol: carolHand.map(toPlayable),
      },
    };
  }

  // A raw dealt Tigress has no declaration yet, but playCard rejects an undeclared
  // Tigress with InvalidTigressDeclaration (see packages/engine/src/trickPlay.ts) —
  // Round 1 (used by these fixtures) deals a single Card per Player, so there's no
  // other Card to fall back on if that Card happens to be the Tigress.
  function toPlayable(card: Card): Card {
    return card.kind === "Tigress" && card.declaredAs === undefined
      ? { ...card, declaredAs: "Pirate" }
      : card;
  }

  // A Suited Card has no Suit-following constraint if it's the Trick's first Suited
  // Card; only later plays must match that led Suit if the Player holds one (see
  // packages/engine/src/trickPlay.ts's MustFollowSuit rejection). Tests that have
  // multiple Players play in the same Trick use this to pick a legal Card instead of
  // assuming an arbitrary hand Card will always be playable.
  function suitOf(card: Card): Suit | null {
    return card.kind === "Suited" ? card.suit : null;
  }

  function ledSuitOf(playedCards: readonly Card[]): Suit | null {
    for (const card of playedCards) {
      const suit = suitOf(card);
      if (suit !== null) return suit;
    }
    return null;
  }

  function legalCardFor(hand: readonly Card[], led: Suit | null): Card {
    if (led === null) return hand[0]!;
    return hand.find((card) => suitOf(card) === led) ?? hand[0]!;
  }

  it("rejects a play from a Player before their turn", async () => {
    const { bob, roomCode, hands } = await playableRoomOf3();

    const response = await emit(bob, "playCard", { roomCode, card: hands.Bob });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "PlayCardRejected",
      roomCode,
      reason: "NotYourTurn",
    });
  });

  it("lets every Player see cards played into the current Trick, in play order", async () => {
    const { host, carol, roomCode, hands } = await playableRoomOf3();

    const carolSeesThePlay = new Promise<RoomState>((resolve) => {
      carol.on("roomState", (state) => {
        if ((state.currentTrick?.length ?? 0) === 1) resolve(state);
      });
    });

    const aliceResponse = await emit(host, "playCard", {
      roomCode,
      card: hands.Alice,
    });
    expect(aliceResponse.ok).toBe(true);

    const carolState = await carolSeesThePlay;
    expect(carolState.currentTrick).toEqual([
      { playerName: "Alice", card: hands.Alice },
    ]);
  });

  it("has the Trick's winner lead the next Trick, once every Player has played", async () => {
    const { host, bob, carol, roomCode, hands, fullHands } =
      await playableRoomOf3();

    await emit(host, "playCard", { roomCode, card: hands.Alice });
    const bobCard = legalCardFor(fullHands.Bob, ledSuitOf([hands.Alice]));
    await emit(bob, "playCard", { roomCode, card: bobCard });
    const carolCard = legalCardFor(
      fullHands.Carol,
      ledSuitOf([hands.Alice, bobCard]),
    );
    const response = await emit(carol, "playCard", {
      roomCode,
      card: carolCard,
    });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.currentTrick).toEqual([]);
    expect(["Alice", "Bob", "Carol"]).toContain(response.state.trickLeader);
  });

  it("lets the Trick's winner invoke a named Pirate's unlocked Advanced Pirate Ability", async () => {
    const { host, bob, carol, roomCode } = await startedRoomOf3();
    const aliceResponse = await emit(host, "submitBid", { roomCode, bid: 0 });
    if (!aliceResponse.ok) throw new Error("expected success");

    // Force Bob to have just won a Trick by playing Rosie D'Laney, bypassing the
    // randomness of a real deal so the Ability is deterministically unlocked for him.
    store.saveRoom({
      ...aliceResponse.state,
      pendingPirateAbility: { playerName: "Bob", pirateName: "RosieDLaney" },
    });

    const rejected = await emit(carol, "invokePirateAbility", {
      roomCode,
      effect: { pirateName: "RosieDLaney", chosenLeaderName: "Carol" },
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error("expected rejection");
    expect(rejected.event).toEqual({
      type: "InvokePirateAbilityRejected",
      roomCode,
      reason: "NotYourAbility",
    });

    const response = await emit(bob, "invokePirateAbility", {
      roomCode,
      effect: { pirateName: "RosieDLaney", chosenLeaderName: "Carol" },
    });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.trickLeader).toBe("Carol");
    expect(response.state.pendingPirateAbility).toBeNull();
  });

  it("pauses an Active Room when a Player disconnects, showing everyone who it's waiting on", async () => {
    const { host, bob } = await startedRoomOf3();

    const hostSeesPause = new Promise<RoomState>((resolve) => {
      host.on("roomState", (state) => {
        if (state.status === "Paused") resolve(state);
      });
    });

    bob.disconnect();

    const pausedState = await hostSeesPause;
    expect(pausedState.status).toBe("Paused");
    expect(pausedState.players.find((p) => p.name === "Bob")?.connected).toBe(
      false,
    );
    expect(pausedState.players.find((p) => p.name === "Alice")?.connected).toBe(
      true,
    );
  });

  it("resumes a Paused Room once the disconnected Player reconnects, restoring their Bid and hand", async () => {
    const { host, bob, carol, roomCode } = await startedRoomOf3();
    await emit(host, "submitBid", { roomCode, bid: 1 });
    const bobBidResponse = await emit(bob, "submitBid", { roomCode, bid: 0 });
    if (!bobBidResponse.ok) throw new Error("expected success");
    const bobHandBeforeDisconnect = bobBidResponse.state.players.find(
      (p) => p.name === "Bob",
    )?.hand;

    const hostSeesPause = new Promise<void>((resolve) => {
      host.on("roomState", (state) => {
        if (state.status === "Paused") resolve();
      });
    });
    bob.disconnect();
    await hostSeesPause;

    const carolSeesResume = new Promise<RoomState>((resolve) => {
      carol.on("roomState", (state) => {
        if (state.status === "Active") resolve(state);
      });
    });

    const bobReconnected = await newClient();
    const reconnectResponse = await emit(bobReconnected, "joinRoom", {
      roomCode,
      displayName: "Bob",
    });

    expect(reconnectResponse.ok).toBe(true);
    if (!reconnectResponse.ok) throw new Error("expected success");
    expect(reconnectResponse.state.status).toBe("Active");
    const reconnectedBob = reconnectResponse.state.players.find(
      (p) => p.name === "Bob",
    );
    expect(reconnectedBob?.connected).toBe(true);
    expect(reconnectedBob?.bid).toBe(0);
    expect(reconnectedBob?.hand).toEqual(bobHandBeforeDisconnect);

    const resumedState = await carolSeesResume;
    expect(resumedState.status).toBe("Active");
  });

  it("rejects a stranger trying to reconnect under a connected Player's name", async () => {
    const { roomCode } = await startedRoomOf3();

    const stranger = await newClient();
    const response = await emit(stranger, "joinRoom", {
      roomCode,
      displayName: "Alice",
    });

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected rejection");
    expect(response.event).toEqual({
      type: "JoinRejected",
      roomCode,
      reason: "AlreadyConnected",
    });
  });

  it("keeps a mid-Trick Paused Room's state intact across a simulated server restart", async () => {
    const { host, bob, roomCode, hands } = await playableRoomOf3();

    await emit(host, "playCard", { roomCode, card: hands.Alice });

    const hostSeesPause = new Promise<void>((resolve) => {
      host.on("roomState", (state) => {
        if (state.status === "Paused") resolve();
      });
    });
    bob.disconnect();
    await hostSeesPause;

    // Simulate a process restart: every remaining socket drops too, so every Player
    // (not just the one already disconnected) has to reconnect afterwards.
    for (const client of clients) client.disconnect();
    clients = [];
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    store.close();

    store = openRoomStore(dbPath);
    server = createRealtimeServer(store);
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, () => resolve());
    });
    port = (server.httpServer.address() as AddressInfo).port;

    const aliceReconnected = await newClient();
    await emit(aliceReconnected, "joinRoom", {
      roomCode,
      displayName: "Alice",
    });
    const carolReconnected = await newClient();
    await emit(carolReconnected, "joinRoom", {
      roomCode,
      displayName: "Carol",
    });
    const bobReconnected = await newClient();
    const response = await emit(bobReconnected, "joinRoom", {
      roomCode,
      displayName: "Bob",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected success");
    expect(response.state.status).toBe("Active");
    expect(response.state.currentTrick).toEqual([
      { playerName: "Alice", card: hands.Alice },
    ]);
    expect(
      response.state.players.find((p) => p.name === "Bob")?.hand,
    ).toContainEqual(hands.Bob);
    expect(response.state.players.every((p) => p.connected)).toBe(true);
  });
});
