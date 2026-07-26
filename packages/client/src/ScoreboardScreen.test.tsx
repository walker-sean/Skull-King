// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ScoreboardScreen } from "./ScoreboardScreen.js";
import { selectScoreboardView } from "./viewModel/scoreboardViewModel.js";
import type { Player, RoomState } from "@skull-king/shared";

afterEach(() => cleanup());

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

describe("ScoreboardScreen", () => {
  it("shows standings at zero before any Round is scored", () => {
    render(<ScoreboardScreen view={selectScoreboardView(roomWith({}))} />);

    expect(screen.queryByRole("heading", { name: /round 1/i })).not.toBeInTheDocument();
    const standings = screen.getByRole("list", { name: /standings/i });
    expect(within(standings).getByText(/alice.*0/i)).toBeInTheDocument();
    expect(within(standings).getByText(/bob.*0/i)).toBeInTheDocument();
  });

  it("renders each scored Round's Traditional breakdown and running totals", () => {
    const room = roomWith({
      players: [playerWith("Alice", 20), playerWith("Bob", -10)],
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
      ],
    });

    render(<ScoreboardScreen view={selectScoreboardView(room)} />);

    expect(
      screen.getByRole("heading", { name: /round 1/i }),
    ).toBeInTheDocument();
    const roundSection = screen.getByRole("heading", {
      name: /round 1/i,
    }).closest("section")!;
    expect(within(roundSection).getByText(/alice/i)).toBeInTheDocument();
    expect(within(roundSection).getByText(/20/)).toBeInTheDocument();
    expect(within(roundSection).getByText(/-10/)).toBeInTheDocument();
  });

  it("renders Rascal Outcome and bet result fields when scored under Rascal Scoring", () => {
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

    render(<ScoreboardScreen view={selectScoreboardView(room)} />);

    expect(screen.getByText(/DirectHit/)).toBeInTheDocument();
    expect(screen.getByText(/CompleteMiss/)).toBeInTheDocument();
  });

  it("highlights the winner once the Game is Completed", () => {
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

    render(<ScoreboardScreen view={selectScoreboardView(room)} />);

    expect(
      screen.getByRole("heading", { name: /final standings/i }),
    ).toBeInTheDocument();
    const standings = screen.getByRole("list", { name: /standings/i });
    const aliceEntry = within(standings).getByText(/alice/i).closest("li")!;
    expect(within(aliceEntry).getByText(/winner/i)).toBeInTheDocument();
    const bobEntry = within(standings).getByText(/bob/i).closest("li")!;
    expect(within(bobEntry).queryByText(/winner/i)).not.toBeInTheDocument();
  });

  it("calls out joint winners when tied for the top final score", () => {
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

    render(<ScoreboardScreen view={selectScoreboardView(room)} />);

    const standings = screen.getByRole("list", { name: /standings/i });
    expect(
      within(within(standings).getByText(/alice/i).closest("li")!).getByText(
        /winner/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(within(standings).getByText(/bob/i).closest("li")!).getByText(
        /winner/i,
      ),
    ).toBeInTheDocument();
  });
});
