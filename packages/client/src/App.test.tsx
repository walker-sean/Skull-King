// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { RoomState } from "@skull-king/shared";
import { App } from "./App.js";
import type { SocketClient } from "./socketClient.js";

afterEach(() => cleanup());

function createMockSocketClient(
  overrides: Partial<SocketClient> = {},
): SocketClient {
  let roomStateHandler: ((state: RoomState) => void) | null = null;

  return {
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    startGame: vi.fn(),
    submitBid: vi.fn(),
    playCard: vi.fn(),
    onRoomState: vi.fn((handler) => {
      roomStateHandler = handler;
      return () => {
        roomStateHandler = null;
      };
    }),
    disconnect: vi.fn(),
    // Test-only escape hatch to simulate a broadcast arriving from the server.
    ...({
      emitRoomState: (state: RoomState) => roomStateHandler?.(state),
    } as object),
    ...overrides,
  } as SocketClient;
}

const lobbyState: RoomState = {
  roomCode: "ABCD",
  status: "Lobby",
  players: [
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
  ],
  scoringMode: null,
  currentRound: null,
  currentTrick: null,
  trickLeader: null,
  alliances: [],
  remainingDeck: [],
  pendingPirateAbility: null,
  pirateBets: [],
  cardBonuses: [],
  roundScores: [],
  pendingReveal: null,
};

describe("App", () => {
  it("shows Create Room and Join Room sections on first render", () => {
    render(<App socketClient={createMockSocketClient()} />);

    expect(
      screen.getByRole("heading", { name: /create a room/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /join a room/i }),
    ).toBeInTheDocument();
  });

  it("creates a Room and shows the Lobby roster on success", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: lobbyState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    expect(await screen.findByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(socketClient.createRoom).toHaveBeenCalledWith("Alice");
  });

  it("joins a Room and shows the Lobby roster on success", async () => {
    const joinedState: RoomState = {
      ...lobbyState,
      players: [
        ...lobbyState.players,
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
      ],
    };
    const socketClient = createMockSocketClient({
      joinRoom: vi.fn().mockResolvedValue({ ok: true, state: joinedState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/room code/i), {
      target: { value: "ABCD" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(socketClient.joinRoom).toHaveBeenCalledWith("ABCD", "Bob");
  });

  it("shows an error and stays on the Home screen when joining is rejected", async () => {
    const socketClient = createMockSocketClient({
      joinRoom: vi.fn().mockResolvedValue({
        ok: false,
        event: { type: "JoinRejected", roomCode: "ABCD", reason: "NameTaken" },
      }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/room code/i), {
      target: { value: "ABCD" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(
      await screen.findByText(/that name is already taken/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /join a room/i }),
    ).toBeInTheDocument();
  });

  it("live-updates the Lobby roster when the server broadcasts a new Room state", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: lobbyState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText("ABCD");

    const updated: RoomState = {
      ...lobbyState,
      players: [
        ...lobbyState.players,
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
      ],
    };
    (
      socketClient as unknown as { emitRoomState: (s: RoomState) => void }
    ).emitRoomState(updated);

    expect(await screen.findByText("Bob")).toBeInTheDocument();
  });

  it("blocks the Host from starting the Game with fewer than 3 Players, showing a reason", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: lobbyState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText("ABCD");

    expect(screen.getByRole("button", { name: /start game/i })).toBeDisabled();
    expect(screen.getByText(/need at least 3 players/i)).toBeInTheDocument();
  });

  it("lets the Host pick a Scoring Mode and start the Game once enough Players have joined", async () => {
    const threePlayerState: RoomState = {
      ...lobbyState,
      players: [
        ...lobbyState.players,
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
        {
          name: "Carol",
          isHost: false,
          connected: true,
          hand: [],
          bid: null,
          hasBid: false,
          tricksWon: 0,
          score: 0,
        },
      ],
    };
    const startedState: RoomState = {
      ...threePlayerState,
      status: "Active",
      scoringMode: "Rascal",
      currentRound: 1,
      players: threePlayerState.players.map((player) => ({
        ...player,
        hand: [{ kind: "Escape" }],
      })),
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: threePlayerState }),
      startGame: vi.fn().mockResolvedValue({ ok: true, state: startedState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText("ABCD");

    fireEvent.change(screen.getByLabelText(/scoring mode/i), {
      target: { value: "Rascal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    expect(await screen.findByText(/round 1/i)).toBeInTheDocument();
    expect(socketClient.startGame).toHaveBeenCalledWith("ABCD", "Rascal");
  });

  it("shows a reason on the Lobby screen when the server rejects starting the Game", async () => {
    const threePlayerState: RoomState = {
      ...lobbyState,
      players: [
        ...lobbyState.players,
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
        {
          name: "Carol",
          isHost: false,
          connected: true,
          hand: [],
          bid: null,
          hasBid: false,
          tricksWon: 0,
          score: 0,
        },
      ],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: threePlayerState }),
      startGame: vi.fn().mockResolvedValue({
        ok: false,
        event: {
          type: "StartGameRejected",
          roomCode: "ABCD",
          reason: "RoomNotInLobby",
        },
      }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText("ABCD");

    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    expect(
      await screen.findByText(/this room has already started/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toBeInTheDocument();
  });

  const biddingAlice = {
    name: "Alice",
    isHost: true,
    connected: true,
    hand: [{ kind: "Escape" }, { kind: "Escape" }, { kind: "Escape" }],
    bid: null,
    hasBid: false,
    tricksWon: 0,
    score: 0,
  } as const satisfies RoomState["players"][number];
  const biddingBob = {
    name: "Bob",
    isHost: false,
    connected: true,
    hand: [],
    bid: null,
    hasBid: false,
    tricksWon: 0,
    score: 0,
  } as const satisfies RoomState["players"][number];

  const biddingState: RoomState = {
    roomCode: "ABCD",
    status: "Active",
    players: [biddingAlice, biddingBob],
    scoringMode: "Traditional",
    currentRound: 3,
    currentTrick: [],
    trickLeader: "Alice",
    alliances: [],
    remainingDeck: [],
    pendingPirateAbility: null,
    pirateBets: [],
    cardBonuses: [],
    roundScores: [],
    pendingReveal: null,
  };

  it("submits a Bid and reflects it once the server confirms it", async () => {
    const afterBid: RoomState = {
      ...biddingState,
      players: [{ ...biddingAlice, bid: 2, hasBid: true }, biddingBob],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: biddingState }),
      submitBid: vi.fn().mockResolvedValue({ ok: true, state: afterBid }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 3/i);

    fireEvent.change(screen.getByLabelText(/^bid$/i), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit bid/i }));

    expect(socketClient.submitBid).toHaveBeenCalledWith("ABCD", 2);
    expect(await screen.findByText("Your Bid: 2")).toBeInTheDocument();
  });

  it("does not let a Player resubmit once their Bid is recorded", async () => {
    const alreadyBid: RoomState = {
      ...biddingState,
      players: [{ ...biddingAlice, bid: 3, hasBid: true }, biddingBob],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: alreadyBid }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    expect(await screen.findByText("Your Bid: 3")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^bid$/i)).not.toBeInTheDocument();
  });

  it("shows other Players as having bid without revealing values, then moves to Trick-play once everyone's in", async () => {
    const partiallyBid: RoomState = {
      ...biddingState,
      players: [
        { ...biddingAlice, hasBid: true, bid: null },
        { ...biddingBob, hasBid: false, bid: null },
      ],
    };
    const socketClient = createMockSocketClient({
      joinRoom: vi.fn().mockResolvedValue({ ok: true, state: partiallyBid }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/room code/i), {
      target: { value: "ABCD" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(await screen.findByText(/has bid/i)).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();

    const revealed: RoomState = {
      ...partiallyBid,
      players: [
        { ...biddingAlice, bid: 2, hasBid: true },
        { ...biddingBob, bid: 1, hasBid: true },
      ],
    };
    (
      socketClient as unknown as { emitRoomState: (s: RoomState) => void }
    ).emitRoomState(revealed);

    expect(await screen.findByText("Waiting for Alice")).toBeInTheDocument();
    expect(screen.getByText(/your hand/i)).toBeInTheDocument();
  });

  it("shows the rejection message when a Bid submission is rejected", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: biddingState }),
      submitBid: vi.fn().mockResolvedValue({
        ok: false,
        event: {
          type: "SubmitBidRejected",
          roomCode: "ABCD",
          reason: "InvalidBid",
        },
      }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 3/i);

    fireEvent.change(screen.getByLabelText(/^bid$/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit bid/i }));

    expect(
      await screen.findByText(/that bid isn't valid/i),
    ).toBeInTheDocument();
  });

  const trickPlayAlice = {
    name: "Alice",
    isHost: true,
    connected: true,
    hand: [
      { kind: "Suited", suit: "Parrot", rank: 7 },
      { kind: "Tigress" },
    ],
    bid: 1,
    hasBid: true,
    tricksWon: 0,
    score: 0,
  } as const satisfies RoomState["players"][number];
  const trickPlayBob = {
    name: "Bob",
    isHost: false,
    connected: true,
    hand: [{ kind: "Escape" }],
    bid: 0,
    hasBid: true,
    tricksWon: 0,
    score: 0,
  } as const satisfies RoomState["players"][number];
  const trickPlayCarol = {
    name: "Carol",
    isHost: false,
    connected: true,
    hand: [{ kind: "Escape" }],
    bid: 0,
    hasBid: true,
    tricksWon: 0,
    score: 0,
  } as const satisfies RoomState["players"][number];

  const trickPlayState: RoomState = {
    roomCode: "ABCD",
    status: "Active",
    players: [trickPlayAlice, trickPlayBob, trickPlayCarol],
    scoringMode: "Traditional",
    currentRound: 1,
    currentTrick: [],
    trickLeader: "Alice",
    alliances: [],
    remainingDeck: [],
    pendingPirateAbility: null,
    pirateBets: [],
    cardBonuses: [],
    roundScores: [],
    pendingReveal: null,
  };

  it("plays a legal card once Bidding is complete, reflecting it in the Trick and Hand", async () => {
    const afterPlay: RoomState = {
      ...trickPlayState,
      currentTrick: [
        { playerName: "Alice", card: { kind: "Suited", suit: "Parrot", rank: 7 } },
      ],
      players: [
        { ...trickPlayAlice, hand: [{ kind: "Tigress" }] },
        trickPlayBob,
        trickPlayCarol,
      ],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: trickPlayState }),
      playCard: vi.fn().mockResolvedValue({ ok: true, state: afterPlay }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 1/i);

    expect(screen.getByText("Your turn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Parrot 7" }));

    expect(socketClient.playCard).toHaveBeenCalledWith("ABCD", {
      kind: "Suited",
      suit: "Parrot",
      rank: 7,
    });
    expect(await screen.findByText("Alice (You): Parrot 7")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Parrot 7" }),
    ).not.toBeInTheDocument();
  });

  it("requires declaring the Tigress as Pirate or Escape before it's played", async () => {
    const afterPlay: RoomState = {
      ...trickPlayState,
      currentTrick: [
        { playerName: "Alice", card: { kind: "Tigress", declaredAs: "Pirate" } },
      ],
      players: [
        {
          ...trickPlayAlice,
          hand: [{ kind: "Suited", suit: "Parrot", rank: 7 }],
        },
        trickPlayBob,
        trickPlayCarol,
      ],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: trickPlayState }),
      playCard: vi.fn().mockResolvedValue({ ok: true, state: afterPlay }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 1/i);

    fireEvent.click(screen.getByRole("button", { name: "Tigress" }));

    expect(socketClient.playCard).not.toHaveBeenCalled();
    expect(screen.getByText(/play the tigress as/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /play as pirate/i }));

    expect(socketClient.playCard).toHaveBeenCalledWith("ABCD", {
      kind: "Tigress",
      declaredAs: "Pirate",
    });
  });

  it("narrates a won Trick once it completes, naming the winner", async () => {
    const almostCompleteTrick: RoomState = {
      ...trickPlayState,
      currentTrick: [
        { playerName: "Bob", card: { kind: "Escape" } },
        { playerName: "Carol", card: { kind: "Escape" } },
      ],
      trickLeader: "Bob",
    };
    const afterTrick: RoomState = {
      ...trickPlayState,
      currentTrick: [],
      trickLeader: "Alice",
      players: [
        { ...trickPlayAlice, hand: [{ kind: "Tigress" }], tricksWon: 1 },
        trickPlayBob,
        trickPlayCarol,
      ],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: almostCompleteTrick }),
      playCard: vi.fn().mockResolvedValue({ ok: true, state: afterTrick }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 1/i);

    expect(screen.getByText("Your turn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Parrot 7" }));

    expect(await screen.findByText("Alice won the Trick")).toBeInTheDocument();
  });

  it("narrates a voided Trick when no Player's tricksWon changed (a Kraken was in play)", async () => {
    const almostCompleteTrick: RoomState = {
      ...trickPlayState,
      currentTrick: [
        { playerName: "Bob", card: { kind: "Kraken" } },
        { playerName: "Carol", card: { kind: "Escape" } },
      ],
      trickLeader: "Bob",
    };
    const afterTrick: RoomState = {
      ...trickPlayState,
      currentTrick: [],
      trickLeader: "Carol",
      players: [
        { ...trickPlayAlice, hand: [{ kind: "Tigress" }] },
        trickPlayBob,
        trickPlayCarol,
      ],
    };
    const socketClient = createMockSocketClient({
      createRoom: vi
        .fn()
        .mockResolvedValue({ ok: true, state: almostCompleteTrick }),
      playCard: vi.fn().mockResolvedValue({ ok: true, state: afterTrick }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText(/round 1/i);

    fireEvent.click(screen.getByRole("button", { name: "Parrot 7" }));

    expect(await screen.findByText("Trick voided")).toBeInTheDocument();
  });
});
