import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState } from "@skull-king/shared";
import {
  deriveDrawnCards,
  selectPeekedCards,
  selectPirateAbilityView,
} from "./pirateAbilityViewModel.js";

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

const escape: Card = { kind: "Escape" };
const parrot7: Card = { kind: "Suited", suit: "Parrot", rank: 7 };

describe("selectPirateAbilityView", () => {
  it("returns null when no ability is pending", () => {
    expect(selectPirateAbilityView(roomWith(), "Alice")).toBeNull();
  });

  it("flags isSelf true and includes the acting Player's hand when the local Player owns the pending ability", () => {
    const room = roomWith({
      players: [
        playerWith("Alice", { hand: [escape, parrot7], bid: 2 }),
        playerWith("Bob"),
        playerWith("Carol"),
      ],
      pendingPirateAbility: { playerName: "Alice", pirateName: "HarryTheGiant" },
    });

    const view = selectPirateAbilityView(room, "Alice");

    expect(view).toEqual({
      pirateName: "HarryTheGiant",
      playerName: "Alice",
      isSelf: true,
      playerNames: ["Alice", "Bob", "Carol"],
      currentBid: 2,
      handSize: 2,
      hand: [escape, parrot7],
    });
  });

  it("flags isSelf false and omits the hand when the ability is pending for another Player", () => {
    const room = roomWith({
      players: [
        playerWith("Alice", { hand: [escape, parrot7], bid: 2 }),
        playerWith("Bob"),
        playerWith("Carol"),
      ],
      pendingPirateAbility: { playerName: "Alice", pirateName: "RosieDLaney" },
    });

    const view = selectPirateAbilityView(room, "Bob");

    expect(view).toEqual({
      pirateName: "RosieDLaney",
      playerName: "Alice",
      isSelf: false,
      playerNames: ["Alice", "Bob", "Carol"],
      currentBid: 2,
      handSize: 2,
      hand: [],
    });
  });
});

describe("selectPeekedCards", () => {
  it("returns null when there is no pending reveal", () => {
    expect(selectPeekedCards(roomWith(), "Alice")).toBeNull();
  });

  it("returns the peeked cards for the Player the reveal belongs to", () => {
    const room = roomWith({
      pendingReveal: { playerName: "Alice", cards: [escape, parrot7] },
    });

    expect(selectPeekedCards(room, "Alice")).toEqual([escape, parrot7]);
  });

  it("returns null for every other Player, even though this shouldn't happen once the server redacts it", () => {
    const room = roomWith({
      pendingReveal: { playerName: "Alice", cards: [escape, parrot7] },
    });

    expect(selectPeekedCards(room, "Bob")).toBeNull();
  });
});

describe("deriveDrawnCards", () => {
  it("returns null when there is no previous state to compare against", () => {
    expect(deriveDrawnCards(null, roomWith(), "Alice")).toBeNull();
  });

  it("returns null when no Bendt the Bandit invocation just resolved", () => {
    const previous = roomWith({
      players: [playerWith("Alice", { hand: [escape] })],
    });
    const next = roomWith({
      players: [playerWith("Alice", { hand: [escape, parrot7] })],
    });

    expect(deriveDrawnCards(previous, next, "Alice")).toBeNull();
  });

  it("returns null while Bendt's ability is still pending (not yet invoked)", () => {
    const previous = roomWith({
      players: [playerWith("Alice", { hand: [escape] })],
      pendingPirateAbility: { playerName: "Alice", pirateName: "BendtTheBandit" },
    });
    const next = roomWith({
      players: [playerWith("Alice", { hand: [escape] })],
      pendingPirateAbility: { playerName: "Alice", pirateName: "BendtTheBandit" },
    });

    expect(deriveDrawnCards(previous, next, "Alice")).toBeNull();
  });

  it("returns the cards newly in the local Player's hand once their Bendt the Bandit invocation resolves", () => {
    const previous = roomWith({
      players: [playerWith("Alice", { hand: [escape, escape] })],
      pendingPirateAbility: { playerName: "Alice", pirateName: "BendtTheBandit" },
    });
    const next = roomWith({
      players: [playerWith("Alice", { hand: [escape, parrot7] })],
      pendingPirateAbility: null,
    });

    expect(deriveDrawnCards(previous, next, "Alice")).toEqual([parrot7]);
  });

  it("returns null when another Player's Bendt the Bandit invocation resolves, not the local Player's", () => {
    const previous = roomWith({
      players: [
        playerWith("Alice", { hand: [escape, escape] }),
        playerWith("Bob"),
      ],
      pendingPirateAbility: { playerName: "Bob", pirateName: "BendtTheBandit" },
    });
    const next = roomWith({
      players: [
        playerWith("Alice", { hand: [escape, parrot7] }),
        playerWith("Bob"),
      ],
      pendingPirateAbility: null,
    });

    expect(deriveDrawnCards(previous, next, "Bob")).toBeNull();
  });
});
