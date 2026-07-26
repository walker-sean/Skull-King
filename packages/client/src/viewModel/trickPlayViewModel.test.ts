import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState } from "@skull-king/shared";
import { deriveTrickOutcome, selectTrickPlayView } from "./trickPlayViewModel.js";

function playerWith(name: string, overrides: Partial<Player> = {}): Player {
  return {
    name,
    isHost: false,
    connected: true,
    hand: [],
    bid: null,
    hasBid: true,
    tricksWon: 0,
    score: 0,
    ...overrides,
  };
}

function roomWith(overrides: Partial<RoomState> = {}): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players: [playerWith("Alice"), playerWith("Bob"), playerWith("Carol")],
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
    ...overrides,
  };
}

const parrot7: Card = { kind: "Suited", suit: "Parrot", rank: 7 };
const jollyRoger3: Card = { kind: "Suited", suit: "JollyRoger", rank: 3 };
const escape: Card = { kind: "Escape" };

describe("selectTrickPlayView", () => {
  it("marks legal and illegal Hand cards using legalPlays, respecting the led Suit", () => {
    const room = roomWith({
      players: [
        playerWith("Alice", { hand: [parrot7, jollyRoger3, escape] }),
        playerWith("Bob"),
        playerWith("Carol"),
      ],
      currentTrick: [{ playerName: "Bob", card: { kind: "Suited", suit: "Parrot", rank: 2 } }],
      trickLeader: "Bob",
    });

    const view = selectTrickPlayView(room, "Alice", null);

    expect(view.hand).toEqual([
      { card: parrot7, legal: true },
      { card: jollyRoger3, legal: false },
      { card: escape, legal: true },
    ]);
  });

  it("indicates whose turn it is and whether it's the local Player's turn", () => {
    const room = roomWith({
      currentTrick: [{ playerName: "Alice", card: escape }],
      trickLeader: "Alice",
    });

    const bobView = selectTrickPlayView(room, "Bob", null);
    expect(bobView.currentTurnPlayerName).toBe("Bob");
    expect(bobView.isYourTurn).toBe(true);

    const carolView = selectTrickPlayView(room, "Carol", null);
    expect(carolView.currentTurnPlayerName).toBe("Bob");
    expect(carolView.isYourTurn).toBe(false);
  });

  it("renders the Trick in progress in play order, flagging the local Player's own plays", () => {
    const room = roomWith({
      currentTrick: [
        { playerName: "Alice", card: parrot7 },
        { playerName: "Bob", card: escape },
      ],
      trickLeader: "Alice",
    });

    const view = selectTrickPlayView(room, "Bob", null);

    expect(view.currentTrick).toEqual([
      { playerName: "Alice", card: parrot7, isSelf: false },
      { playerName: "Bob", card: escape, isSelf: true },
    ]);
  });

  it("passes through the given Trick outcome untouched", () => {
    const room = roomWith();
    const outcome = { type: "Won", winnerName: "Alice" } as const;

    expect(selectTrickPlayView(room, "Bob", outcome).outcome).toEqual(outcome);
    expect(selectTrickPlayView(room, "Bob", null).outcome).toBeNull();
  });

  it("reports each Player's Tricks won and whether it's currently their turn", () => {
    const room = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 2 }),
        playerWith("Bob", { tricksWon: 1 }),
        playerWith("Carol", { tricksWon: 0 }),
      ],
      currentTrick: [],
      trickLeader: "Bob",
    });

    const view = selectTrickPlayView(room, "Carol", null);

    expect(view.players).toEqual([
      { name: "Alice", isSelf: false, isCurrentTurn: false, tricksWon: 2 },
      { name: "Bob", isSelf: false, isCurrentTurn: true, tricksWon: 1 },
      { name: "Carol", isSelf: true, isCurrentTurn: false, tricksWon: 0 },
    ]);
  });
});

describe("deriveTrickOutcome", () => {
  it("returns null when there is no previous state to compare against", () => {
    expect(deriveTrickOutcome(null, roomWith())).toBeNull();
  });

  it("returns null when the Trick in progress hasn't just completed", () => {
    const previous = roomWith({ currentTrick: [] });
    const next = roomWith({
      currentTrick: [{ playerName: "Alice", card: parrot7 }],
    });

    expect(deriveTrickOutcome(previous, next)).toBeNull();
  });

  it("names the winner once tricksWon increments for them and the Trick has emptied", () => {
    const previous = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 0 }),
        playerWith("Bob", { tricksWon: 0 }),
        playerWith("Carol", { tricksWon: 0 }),
      ],
      currentTrick: [
        { playerName: "Alice", card: parrot7 },
        { playerName: "Bob", card: escape },
        { playerName: "Carol", card: jollyRoger3 },
      ],
    });
    const next = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 0 }),
        playerWith("Bob", { tricksWon: 0 }),
        playerWith("Carol", { tricksWon: 1 }),
      ],
      currentTrick: [],
      trickLeader: "Carol",
    });

    expect(deriveTrickOutcome(previous, next)).toEqual({
      type: "Won",
      winnerName: "Carol",
    });
  });

  it("narrates a void when no Player's tricksWon changed (a Kraken or White Whale was in play)", () => {
    const previous = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 0 }),
        playerWith("Bob", { tricksWon: 0 }),
        playerWith("Carol", { tricksWon: 0 }),
      ],
      currentTrick: [
        { playerName: "Alice", card: { kind: "Kraken" } },
        { playerName: "Bob", card: escape },
        { playerName: "Carol", card: jollyRoger3 },
      ],
    });
    const next = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 0 }),
        playerWith("Bob", { tricksWon: 0 }),
        playerWith("Carol", { tricksWon: 0 }),
      ],
      currentTrick: [],
      trickLeader: "Carol",
    });

    expect(deriveTrickOutcome(previous, next)).toEqual({ type: "Voided" });
  });

  it("stays silent (rather than misreporting a void) when the completed Trick also ended the Round", () => {
    // advanceRound resets every Player's tricksWon to 0 for the next Round in the very same
    // transition that empties currentTrick, so the tricksWon-increment signal this derivation
    // relies on is wiped out even though Carol genuinely won the Round's last Trick.
    const previous = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 3 }),
        playerWith("Bob", { tricksWon: 2 }),
        playerWith("Carol", { tricksWon: 4 }),
      ],
      currentTrick: [
        { playerName: "Alice", card: parrot7 },
        { playerName: "Bob", card: escape },
        { playerName: "Carol", card: jollyRoger3 },
      ],
      roundScores: [],
    });
    const next = roomWith({
      players: [
        playerWith("Alice", { tricksWon: 0, hasBid: false }),
        playerWith("Bob", { tricksWon: 0, hasBid: false }),
        playerWith("Carol", { tricksWon: 0, hasBid: false }),
      ],
      currentTrick: [],
      currentRound: 4,
      trickLeader: "Alice",
      roundScores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 0,
          allianceBonus: 0,
          roundPoints: 0,
          totalScore: 0,
        },
      ],
    });

    expect(deriveTrickOutcome(previous, next)).toBeNull();
  });
});
