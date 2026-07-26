import { describe, expect, it } from "vitest";
import type { Player, RoomState } from "@skull-king/shared";
import { selectScoreboardView } from "./scoreboardViewModel.js";

function playerWith(name: string, score: number): Player {
  return {
    name,
    isHost: false,
    connected: true,
    hand: [],
    bid: null,
    hasBid: false,
    tricksWon: 0,
    score,
  };
}

function roomWith(overrides: Partial<RoomState>): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players: [playerWith("Alice", 0), playerWith("Bob", 0)],
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
    ...overrides,
  };
}

describe("selectScoreboardView", () => {
  it("shows standings at zero before any Round is scored", () => {
    const room = roomWith({});

    const view = selectScoreboardView(room);

    expect(view.rounds).toEqual([]);
    expect(view.standings).toEqual([
      { playerName: "Alice", totalScore: 0 },
      { playerName: "Bob", totalScore: 0 },
    ]);
    expect(view.isCompleted).toBe(false);
    expect(view.winnerNames).toEqual([]);
  });

  it("groups a flat Traditional roundScores array into one entry per Round", () => {
    const room = roomWith({
      players: [playerWith("Alice", 30), playerWith("Bob", -10)],
      roundScores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 20,
          allianceBonus: 0,
          roundPoints: 20,
          totalScore: 20,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: -10,
          allianceBonus: 0,
          roundPoints: -10,
          totalScore: -10,
        },
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 10,
          allianceBonus: 0,
          roundPoints: 10,
          totalScore: 30,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: 0,
          allianceBonus: 0,
          roundPoints: 0,
          totalScore: -10,
        },
      ],
    });

    const view = selectScoreboardView(room);

    expect(view.rounds).toHaveLength(2);
    expect(view.rounds[0]).toEqual({
      round: 1,
      scores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 20,
          allianceBonus: 0,
          roundPoints: 20,
          totalScore: 20,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: -10,
          allianceBonus: 0,
          roundPoints: -10,
          totalScore: -10,
        },
      ],
    });
    expect(view.rounds[1]?.round).toBe(2);
  });

  it("derives current standings from the most recently scored Round, sorted highest-first", () => {
    const room = roomWith({
      players: [playerWith("Alice", 20), playerWith("Bob", 50)],
      roundScores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 20,
          allianceBonus: 0,
          roundPoints: 20,
          totalScore: 20,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: 50,
          allianceBonus: 0,
          roundPoints: 50,
          totalScore: 50,
        },
      ],
    });

    const view = selectScoreboardView(room);

    expect(view.standings).toEqual([
      { playerName: "Bob", totalScore: 50 },
      { playerName: "Alice", totalScore: 20 },
    ]);
  });

  it("groups a flat Rascal roundScores array and preserves Outcome/betResult fields", () => {
    const room = roomWith({
      scoringMode: "Rascal",
      players: [playerWith("Alice", 15), playerWith("Bob", -5)],
      roundScores: [
        {
          scoringMode: "Rascal",
          playerName: "Alice",
          outcome: "DirectHit",
          bidPoints: 10,
          bonusPoints: 5,
          allianceBonus: 0,
          betResult: 0,
          roundPoints: 15,
          totalScore: 15,
        },
        {
          scoringMode: "Rascal",
          playerName: "Bob",
          outcome: "CompleteMiss",
          bidPoints: -5,
          bonusPoints: 0,
          allianceBonus: 0,
          betResult: 0,
          roundPoints: -5,
          totalScore: -5,
        },
      ],
    });

    const view = selectScoreboardView(room);

    expect(view.scoringMode).toBe("Rascal");
    expect(view.rounds[0]?.scores[0]).toMatchObject({
      outcome: "DirectHit",
      betResult: 0,
    });
  });

  it("shows the final standings with the winner highlighted once the Game is Completed", () => {
    const room = roomWith({
      status: "Completed",
      players: [playerWith("Alice", 40), playerWith("Bob", 10)],
      roundScores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 40,
          allianceBonus: 0,
          roundPoints: 40,
          totalScore: 40,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: 10,
          allianceBonus: 0,
          roundPoints: 10,
          totalScore: 10,
        },
      ],
    });

    const view = selectScoreboardView(room);

    expect(view.isCompleted).toBe(true);
    expect(view.winnerNames).toEqual(["Alice"]);
  });

  it("calls out joint winners when the final standings are tied for the top score", () => {
    const room = roomWith({
      status: "Completed",
      players: [playerWith("Alice", 30), playerWith("Bob", 30)],
      roundScores: [
        {
          scoringMode: "Traditional",
          playerName: "Alice",
          bidPoints: 30,
          allianceBonus: 0,
          roundPoints: 30,
          totalScore: 30,
        },
        {
          scoringMode: "Traditional",
          playerName: "Bob",
          bidPoints: 30,
          allianceBonus: 0,
          roundPoints: 30,
          totalScore: 30,
        },
      ],
    });

    const view = selectScoreboardView(room);

    expect(view.winnerNames.sort()).toEqual(["Alice", "Bob"]);
  });
});
