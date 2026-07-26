import { describe, expect, it } from "vitest";
import type {
  Alliance,
  CardBonus,
  Player,
  PirateBet,
} from "@skull-king/shared";
import { classifyOutcome, scoreRascalRound } from "./rascalScoring.js";

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
    hasBid: bid !== null,
    tricksWon,
    score,
  };
}

describe("classifyOutcome", () => {
  it("is a Direct Hit when the Bid was taken exactly", () => {
    expect(classifyOutcome(3, 3)).toBe("DirectHit");
    expect(classifyOutcome(0, 0)).toBe("DirectHit");
  });

  it("is a Glancing Blow when off by exactly one, over or under", () => {
    expect(classifyOutcome(2, 3)).toBe("GlancingBlow");
    expect(classifyOutcome(3, 2)).toBe("GlancingBlow");
  });

  it("is a Complete Miss when off by two or more, over or under", () => {
    expect(classifyOutcome(1, 3)).toBe("CompleteMiss");
    expect(classifyOutcome(4, 1)).toBe("CompleteMiss");
  });
});

describe("scoreRascalRound", () => {
  it("awards the full potential (10 per card dealt) on a Direct Hit", () => {
    const { scores } = scoreRascalRound(
      5,
      [playerWith("Harry", 2, 2)],
      [],
      [],
      [],
    );

    expect(scores).toEqual([
      {
        scoringMode: "Rascal",
        playerName: "Harry",
        outcome: "DirectHit",
        bidPoints: 50,
        bonusPoints: 0,
        allianceBonus: 0,
        betResult: 0,
        roundPoints: 50,
        totalScore: 50,
      },
    ]);
  });

  it("awards half the potential on a Glancing Blow", () => {
    const { scores } = scoreRascalRound(
      4,
      [playerWith("Shirley", 0, 1)],
      [],
      [],
      [],
    );

    expect(scores[0]).toMatchObject({
      outcome: "GlancingBlow",
      bidPoints: 20,
      roundPoints: 20,
    });
  });

  it("awards none of the potential on a Complete Miss", () => {
    const { scores } = scoreRascalRound(
      4,
      [playerWith("Poe", 4, 2)],
      [],
      [],
      [],
    );

    expect(scores[0]).toMatchObject({
      outcome: "CompleteMiss",
      bidPoints: 0,
      roundPoints: 0,
    });
  });

  it("caps cards dealt at the Hand Size Cap for high Round numbers with many Players", () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      playerWith(`P${i}`, 0, 0),
    );
    const { scores } = scoreRascalRound(10, players, [], [], []);

    // 8 players -> hand size cap of floor(74/8) = 9, so Round 10 still deals 9 cards.
    expect(scores[0]?.bidPoints).toBe(90);
  });

  it("splits Bonus points by the same Outcome share as Round points", () => {
    const cardBonuses: CardBonus[] = [
      { round: 3, playerName: "Anne", points: 40 },
    ];

    const direct = scoreRascalRound(
      3,
      [playerWith("Anne", 1, 1)],
      [],
      cardBonuses,
      [],
    );
    expect(direct.scores[0]).toMatchObject({ bonusPoints: 40 });

    const glancing = scoreRascalRound(
      3,
      [playerWith("Anne", 0, 1)],
      [],
      cardBonuses,
      [],
    );
    expect(glancing.scores[0]).toMatchObject({ bonusPoints: 20 });

    const miss = scoreRascalRound(
      3,
      [playerWith("Anne", 3, 0)],
      [],
      cardBonuses,
      [],
    );
    expect(miss.scores[0]).toMatchObject({ bonusPoints: 0 });
  });

  it("sums multiple Bonus-earning Tricks within the same Round", () => {
    const cardBonuses: CardBonus[] = [
      { round: 3, playerName: "Anne", points: 10 },
      { round: 3, playerName: "Anne", points: 20 },
      { round: 4, playerName: "Anne", points: 999 },
    ];

    const { scores } = scoreRascalRound(
      3,
      [playerWith("Anne", 1, 1)],
      [],
      cardBonuses,
      [],
    );

    expect(scores[0]?.bonusPoints).toBe(30);
  });

  it("pays the Alliance bonus to both Allied Players when both hit their Bid", () => {
    const players = [playerWith("Loot", 2, 2), playerWith("Winner", 1, 1)];
    const alliances: Alliance[] = [
      { round: 5, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRascalRound(5, players, alliances, [], []);

    expect(scores.find((s) => s.playerName === "Loot")).toMatchObject({
      allianceBonus: 20,
    });
    expect(scores.find((s) => s.playerName === "Winner")).toMatchObject({
      allianceBonus: 20,
    });
  });

  it("withholds the Alliance bonus when only one Allied Player hits their Bid", () => {
    const players = [playerWith("Loot", 2, 2), playerWith("Winner", 1, 3)];
    const alliances: Alliance[] = [
      { round: 5, lootPlayerName: "Loot", winnerName: "Winner" },
    ];

    const { scores } = scoreRascalRound(5, players, alliances, [], []);

    expect(scores.find((s) => s.playerName === "Loot")?.allianceBonus).toBe(0);
    expect(scores.find((s) => s.playerName === "Winner")?.allianceBonus).toBe(
      0,
    );
  });

  it("wins the bet amount for a Rascal of Roatan bet when the Player hit their Bid", () => {
    const pirateBets: PirateBet[] = [
      { round: 2, playerName: "Rascal", amount: 20 },
    ];

    const { scores } = scoreRascalRound(
      2,
      [playerWith("Rascal", 1, 1)],
      [],
      [],
      pirateBets,
    );

    expect(scores[0]).toMatchObject({ betResult: 20 });
  });

  it("loses the bet amount for a Rascal of Roatan bet when the Player missed their Bid", () => {
    const pirateBets: PirateBet[] = [
      { round: 2, playerName: "Rascal", amount: 10 },
    ];

    const { scores } = scoreRascalRound(
      2,
      [playerWith("Rascal", 1, 3)],
      [],
      [],
      pirateBets,
    );

    expect(scores[0]).toMatchObject({ betResult: -10 });
  });

  it("ignores bets and Bonuses from a different Round", () => {
    const pirateBets: PirateBet[] = [
      { round: 1, playerName: "Rascal", amount: 10 },
    ];
    const cardBonuses: CardBonus[] = [
      { round: 1, playerName: "Rascal", points: 40 },
    ];

    const { scores } = scoreRascalRound(
      2,
      [playerWith("Rascal", 1, 1)],
      [],
      cardBonuses,
      pirateBets,
    );

    expect(scores[0]).toMatchObject({ bonusPoints: 0, betResult: 0 });
  });

  it("adds a Round's total points onto each Player's existing running total", () => {
    const { scores } = scoreRascalRound(
      3,
      [playerWith("Calvin", 1, 1, 100)],
      [],
      [],
      [],
    );

    expect(scores[0]?.totalScore).toBe(130);
  });

  it("returns Players with score set to the new running total", () => {
    const { players } = scoreRascalRound(
      3,
      [playerWith("Calvin", 1, 1, 100)],
      [],
      [],
      [],
    );

    expect(players[0]?.score).toBe(130);
  });
});
