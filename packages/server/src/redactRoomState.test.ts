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

describe("redactRoomStateFor", () => {
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
