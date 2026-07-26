import { describe, expect, it } from "vitest";
import type { Player } from "@skull-king/shared";
import { advanceRound, LAST_ROUND } from "./roundAdvance.js";

function playerWith(name: string, score: number, isHost = false): Player {
  return {
    name,
    isHost,
    connected: true,
    hand: [{ kind: "Escape" }],
    bid: 3,
    hasBid: true,
    tricksWon: 3,
    score,
  };
}

describe("advanceRound", () => {
  it("deals a fresh hand and resets Bid/Tricks Won for the next Round, carrying score forward", () => {
    const players = [
      playerWith("Alice", 40, true),
      playerWith("Bob", 30),
      playerWith("Carol", 20),
    ];

    const result = advanceRound(3, players);

    expect(result.status).toBe("Active");
    expect(result.currentRound).toBe(4);
    for (const player of result.players) {
      expect(player.bid).toBeNull();
      expect(player.tricksWon).toBe(0);
      expect(player.hand).toHaveLength(4);
    }
    expect(result.players.map((p) => p.score)).toEqual([40, 30, 20]);
  });

  it("rotates the Trick leader to the next Player in seat order each Round", () => {
    const players = [
      playerWith("Alice", 0, true),
      playerWith("Bob", 0),
      playerWith("Carol", 0),
    ];

    expect(advanceRound(1, players).trickLeader).toBe("Bob");
    expect(advanceRound(2, players).trickLeader).toBe("Carol");
    expect(advanceRound(3, players).trickLeader).toBe("Alice");
  });

  it("moves the Room to Completed once Round 10 has just been scored, without dealing again", () => {
    const players = [playerWith("Alice", 100, true), playerWith("Bob", 80)];

    const result = advanceRound(LAST_ROUND, players);

    expect(result.status).toBe("Completed");
    expect(result.currentRound).toBe(LAST_ROUND);
    expect(result.trickLeader).toBeNull();
    expect(result.players).toEqual(players);
  });
});
