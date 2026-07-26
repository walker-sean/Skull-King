import { describe, expect, it } from "vitest";
import type { Alliance, Player } from "@skull-king/shared";
import { scoreRound } from "./scoring.js";

function playerWith(
  name: string,
  bid: number,
  tricksWon: number,
  score = 0,
): Player {
  return {
    name,
    isHost: false,
    connected: true,
    hand: [],
    bid,
    tricksWon,
    score,
  };
}

describe("scoreRound", () => {
  it("awards +20 per Trick taken when a Player hits their Bid exactly", () => {
    const { scores } = scoreRound(3, [playerWith("Calvin", 3, 3)], []);

    expect(scores).toEqual([
      {
        playerName: "Calvin",
        bidPoints: 60,
        allianceBonus: 0,
        roundPoints: 60,
        totalScore: 60,
      },
    ]);
  });

  it("deducts 10 per Trick of difference when a Player misses over their Bid", () => {
    const { scores } = scoreRound(4, [playerWith("Angela", 2, 4)], []);

    expect(scores[0]).toMatchObject({ bidPoints: -20, roundPoints: -20 });
  });

  it("deducts 10 per Trick of difference when a Player misses under their Bid", () => {
    const { scores } = scoreRound(4, [playerWith("Angela", 3, 1)], []);

    expect(scores[0]).toMatchObject({ bidPoints: -20, roundPoints: -20 });
  });

  it("awards +10 per card dealt when a Player bids zero and takes zero Tricks", () => {
    const { scores } = scoreRound(7, [playerWith("Kate", 0, 0)], []);

    expect(scores[0]).toMatchObject({ bidPoints: 70, roundPoints: 70 });
  });

  it("deducts 10 per card dealt when a Player bids zero and takes any Tricks", () => {
    const { scores } = scoreRound(9, [playerWith("Johnny", 0, 2)], []);

    expect(scores[0]).toMatchObject({ bidPoints: -90, roundPoints: -90 });
  });

  it("caps cards dealt at the Hand Size Cap for high Round numbers with many Players", () => {
    // 8 players -> hand size cap of floor(74/8) = 9, so Round 10 still deals 9 cards.
    const players = Array.from({ length: 8 }, (_, i) =>
      playerWith(`P${i}`, 0, 0),
    );
    const { scores } = scoreRound(10, players, []);

    expect(scores[0]?.bidPoints).toBe(90);
  });

  it("adds a Round's points onto each Player's existing running total", () => {
    const { scores } = scoreRound(3, [playerWith("Calvin", 3, 3, 100)], []);

    expect(scores[0]?.totalScore).toBe(160);
  });

  it("pays the Alliance bonus to both Allied Players when both hit their Bid", () => {
    const players = [playerWith("Loot", 2, 2), playerWith("Winner", 1, 1)];
    const alliances: Alliance[] = [
      { round: 5, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRound(5, players, alliances);

    expect(scores.find((s) => s.playerName === "Loot")).toMatchObject({
      allianceBonus: 20,
      roundPoints: 60,
    });
    expect(scores.find((s) => s.playerName === "Winner")).toMatchObject({
      allianceBonus: 20,
      roundPoints: 40,
    });
  });

  it("withholds the Alliance bonus when only one Allied Player hits their Bid", () => {
    const players = [playerWith("Loot", 2, 2), playerWith("Winner", 1, 3)];
    const alliances: Alliance[] = [
      { round: 5, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRound(5, players, alliances);

    expect(scores.find((s) => s.playerName === "Loot")?.allianceBonus).toBe(0);
    expect(scores.find((s) => s.playerName === "Winner")?.allianceBonus).toBe(
      0,
    );
  });

  it("withholds the Alliance bonus when both miss their Bid", () => {
    const players = [playerWith("Loot", 2, 0), playerWith("Winner", 1, 3)];
    const alliances: Alliance[] = [
      { round: 5, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRound(5, players, alliances);

    expect(scores.find((s) => s.playerName === "Loot")?.allianceBonus).toBe(0);
    expect(scores.find((s) => s.playerName === "Winner")?.allianceBonus).toBe(
      0,
    );
  });

  it("ignores Alliances formed in a different Round", () => {
    const players = [playerWith("Loot", 2, 2), playerWith("Winner", 1, 1)];
    const alliances: Alliance[] = [
      { round: 4, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRound(5, players, alliances);

    expect(scores.find((s) => s.playerName === "Loot")?.allianceBonus).toBe(0);
  });

  it("returns Players with score set to the new running total", () => {
    const { players } = scoreRound(3, [playerWith("Calvin", 3, 3, 100)], []);

    expect(players[0]?.score).toBe(160);
  });
});
