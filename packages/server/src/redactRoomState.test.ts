import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState } from "@skull-king/shared";
import { redactRoomStateFor } from "./redactRoomState.js";

function playerWith(name: string, hand: Card[], bid: number | null): Player {
  return {
    name,
    isHost: false,
    connected: true,
    hand,
    bid,
    hasBid: bid !== null,
    tricksWon: 0,
    score: 0,
  };
}

function roomWithPendingReveal(): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players: [
      playerWith("Alice", [{ kind: "Escape" }], null),
      playerWith("Bob", [{ kind: "Escape" }], null),
    ],
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
    pendingReveal: {
      playerName: "Alice",
      cards: [{ kind: "Suited", suit: "Parrot", rank: 9 }],
    },
  };
}

function roomWithBids(aliceBid: number | null, bobBid: number | null): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players: [
      playerWith("Alice", [{ kind: "Escape" }], aliceBid),
      playerWith("Bob", [{ kind: "Escape" }], bobBid),
    ],
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
}

describe("redactRoomStateFor", () => {
  it("hides another Player's Bid value but still shows hasBid before every Bid is in", () => {
    const state = roomWithBids(2, null);

    const redacted = redactRoomStateFor(state, "Bob");

    const alice = redacted.players.find((p) => p.name === "Alice");
    expect(alice?.bid).toBeNull();
    expect(alice?.hasBid).toBe(true);
  });

  it("reveals every Player's Bid value the moment all Bids are in", () => {
    const state = roomWithBids(2, 1);

    const redacted = redactRoomStateFor(state, "Bob");

    const alice = redacted.players.find((p) => p.name === "Alice");
    expect(alice?.bid).toBe(2);
    expect(alice?.hasBid).toBe(true);
  });

  it("always shows the viewer their own Bid value", () => {
    const state = roomWithBids(2, null);

    const redacted = redactRoomStateFor(state, "Alice");

    expect(redacted.players.find((p) => p.name === "Alice")?.bid).toBe(2);
  });

  it("shows pendingReveal to the Player it belongs to", () => {
    const state = roomWithPendingReveal();

    const redacted = redactRoomStateFor(state, "Alice");

    expect(redacted.pendingReveal).toEqual(state.pendingReveal);
  });

  it("hides pendingReveal from every other Player", () => {
    const state = roomWithPendingReveal();

    expect(redactRoomStateFor(state, "Bob").pendingReveal).toBeNull();
    expect(redactRoomStateFor(state, null).pendingReveal).toBeNull();
  });

  it("stays null when no reveal is pending", () => {
    const state = { ...roomWithPendingReveal(), pendingReveal: null };

    expect(redactRoomStateFor(state, "Alice").pendingReveal).toBeNull();
  });
});
