import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState } from "@skull-king/shared";
import { selectBiddingView } from "./biddingViewModel.js";

function handOf(size: number): Card[] {
  return Array.from({ length: size }, (_, index) => ({
    kind: "Suited",
    suit: "PirateMap",
    rank: index + 1,
  }));
}

function playerWith(
  name: string,
  hand: Card[],
  bid: number | null,
  hasBid: boolean,
): Player {
  return {
    name,
    isHost: false,
    connected: true,
    hand,
    bid,
    hasBid,
    tricksWon: 0,
    score: 0,
  };
}

function roomWith(players: Player[]): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players,
    scoringMode: "Traditional",
    currentRound: 3,
    currentTrick: [],
    trickLeader: players[0]?.name ?? null,
    alliances: [],
    remainingDeck: [],
    pendingPirateAbility: null,
    pirateBets: [],
    cardBonuses: [],
    roundScores: [],
    pendingReveal: null,
  };
}

describe("selectBiddingView", () => {
  it("passes through the current Round and the local Player's hand", () => {
    const room = roomWith([
      playerWith("Alice", handOf(3), null, false),
      playerWith("Bob", handOf(3), null, false),
    ]);

    const view = selectBiddingView(room, "Alice");

    expect(view.currentRound).toBe(3);
    expect(view.hand).toEqual(handOf(3));
    expect(view.handSize).toBe(3);
  });

  it("reports the local Player's own Bid submission status and value", () => {
    const notBidYet = roomWith([
      playerWith("Alice", handOf(3), null, false),
      playerWith("Bob", handOf(3), null, false),
    ]);
    expect(selectBiddingView(notBidYet, "Alice").localHasBid).toBe(false);
    expect(selectBiddingView(notBidYet, "Alice").localBid).toBeNull();

    const bidSubmitted = roomWith([
      playerWith("Alice", handOf(3), 2, true),
      playerWith("Bob", handOf(3), null, false),
    ]);
    expect(selectBiddingView(bidSubmitted, "Alice").localHasBid).toBe(true);
    expect(selectBiddingView(bidSubmitted, "Alice").localBid).toBe(2);
  });

  it("passes through a redacted Bid (hasBid true, value hidden) without re-deriving or leaking it", () => {
    // As received from the wire, redactRoomStateFor has already nulled Alice's Bid
    // value for every viewer but Alice, while leaving hasBid visible.
    const room = roomWith([
      playerWith("Alice", handOf(3), null, true),
      playerWith("Bob", handOf(3), null, false),
    ]);

    const view = selectBiddingView(room, "Bob");

    expect(view.allBidsRevealed).toBe(false);
    const alice = view.players.find((player) => player.name === "Alice");
    expect(alice?.hasBid).toBe(true);
    expect(alice?.bid).toBeNull();
  });

  it("reveals every Player's Bid value the moment all Bids are in", () => {
    const room = roomWith([
      playerWith("Alice", handOf(3), 2, true),
      playerWith("Bob", handOf(3), 1, true),
    ]);

    const view = selectBiddingView(room, "Bob");

    expect(view.allBidsRevealed).toBe(true);
    expect(view.players.find((player) => player.name === "Alice")?.bid).toBe(
      2,
    );
    expect(view.players.find((player) => player.name === "Bob")?.bid).toBe(1);
  });

  it("flags which roster entry is the local Player", () => {
    const room = roomWith([
      playerWith("Alice", handOf(3), null, false),
      playerWith("Bob", handOf(3), null, false),
    ]);

    const view = selectBiddingView(room, "Bob");

    expect(view.players.map((player) => player.isSelf)).toEqual([
      false,
      true,
    ]);
  });
});
