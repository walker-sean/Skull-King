import { describe, expect, it } from "vitest";
import type { Alliance, Player, RoomState } from "@skull-king/shared";
import { deriveNewAlliance, isAllianceVisibleTo } from "./allianceViewModel.js";

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

const allianceOne: Alliance = {
  round: 3,
  lootPlayerName: "Bob",
  winnerName: "Carol",
};

describe("deriveNewAlliance", () => {
  it("returns null when there is no previous state to compare against", () => {
    expect(deriveNewAlliance(null, roomWith({ alliances: [allianceOne] }))).toBeNull();
  });

  it("returns null when no new Alliance has formed", () => {
    const previous = roomWith({ alliances: [allianceOne] });
    const next = roomWith({ alliances: [allianceOne] });

    expect(deriveNewAlliance(previous, next)).toBeNull();
  });

  it("returns the newly formed Alliance once the array grows", () => {
    const previous = roomWith({ alliances: [] });
    const next = roomWith({ alliances: [allianceOne] });

    expect(deriveNewAlliance(previous, next)).toEqual(allianceOne);
  });

  it("returns the most recently formed Alliance when more than one formed at once", () => {
    const allianceTwo: Alliance = {
      round: 3,
      lootPlayerName: "Alice",
      winnerName: "Bob",
    };
    const previous = roomWith({ alliances: [] });
    const next = roomWith({ alliances: [allianceOne, allianceTwo] });

    expect(deriveNewAlliance(previous, next)).toEqual(allianceTwo);
  });
});

describe("isAllianceVisibleTo", () => {
  it("is visible to the Player who played the Loot card", () => {
    expect(isAllianceVisibleTo(allianceOne, "Bob")).toBe(true);
  });

  it("is visible to the Player who won the Trick", () => {
    expect(isAllianceVisibleTo(allianceOne, "Carol")).toBe(true);
  });

  it("is not visible to an uninvolved Player", () => {
    expect(isAllianceVisibleTo(allianceOne, "Alice")).toBe(false);
  });
});
