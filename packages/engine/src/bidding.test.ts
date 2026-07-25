import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState } from "@skull-king/shared";
import { areAllBidsSubmitted, submitBid } from "./bidding.js";

function handOf(size: number): Card[] {
  return Array.from({ length: size }, (_, index) => ({
    kind: "Suited",
    suit: "PirateMap",
    rank: index + 1,
  }));
}

function playersWithHands(handSize: number, count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player${index + 1}`,
    isHost: index === 0,
    connected: true,
    hand: handOf(handSize),
    bid: null,
  }));
}

function activeRoomWith(handSize: number, count: number): RoomState {
  const players = playersWithHands(handSize, count);
  return {
    roomCode: "ABCD",
    status: "Active",
    players,
    scoringMode: "Traditional",
    currentRound: handSize,
    currentTrick: [],
    trickLeader: players[0]?.name ?? null,
  };
}

describe("submitBid", () => {
  it("records the Player's Bid and confirms it with a BidSubmitted event", () => {
    const room = activeRoomWith(3, 3);
    const result = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 2,
      actorName: "Player1",
    });

    expect(result.state?.players.find((p) => p.name === "Player1")?.bid).toBe(2);
    expect(result.events).toEqual([
      { type: "BidSubmitted", roomCode: "ABCD", playerName: "Player1" },
    ]);
  });

  it("leaves other Players' Bids untouched", () => {
    const room = activeRoomWith(3, 3);
    const result = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: "Player1",
    });

    expect(result.state?.players.find((p) => p.name === "Player2")?.bid).toBeNull();
    expect(result.state?.players.find((p) => p.name === "Player3")?.bid).toBeNull();
  });

  it("accepts a Bid of 0 and a Bid equal to the full hand size", () => {
    const room = activeRoomWith(3, 3);

    expect(
      submitBid(room, { type: "SubmitBid", roomCode: "ABCD", bid: 0, actorName: "Player1" }).state
        ?.players[0]?.bid,
    ).toBe(0);
    expect(
      submitBid(room, { type: "SubmitBid", roomCode: "ABCD", bid: 3, actorName: "Player1" }).state
        ?.players[0]?.bid,
    ).toBe(3);
  });

  it("rejects a Bid on a Room Code with no matching Room", () => {
    const result = submitBid(null, {
      type: "SubmitBid",
      roomCode: "ZZZZ",
      bid: 1,
      actorName: "Player1",
    });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ZZZZ", reason: "RoomNotFound" },
    ]);
  });

  it("rejects a Bid while the Room is still in Lobby, leaving state unchanged", () => {
    const room: RoomState = { ...activeRoomWith(3, 3), status: "Lobby" };
    const result = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: "Player1",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "RoomNotActive" },
    ]);
  });

  it("rejects a Bid from an actor identity that isn't in the Room, leaving state unchanged", () => {
    const room = activeRoomWith(3, 3);
    const result = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: "Stranger",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "PlayerNotFound" },
    ]);
  });

  it("rejects a Bid with no actor identity, leaving state unchanged", () => {
    const room = activeRoomWith(3, 3);
    const result = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: null,
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "PlayerNotFound" },
    ]);
  });

  it("rejects a second Bid from a Player who already submitted one, leaving state unchanged", () => {
    const room = activeRoomWith(3, 3);
    const firstBid = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: "Player1",
    });

    const secondBid = submitBid(firstBid.state, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 2,
      actorName: "Player1",
    });

    expect(secondBid.state).toEqual(firstBid.state);
    expect(secondBid.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "AlreadyBid" },
    ]);
  });

  it("rejects a negative Bid or a Bid above the Player's hand size, leaving state unchanged", () => {
    const room = activeRoomWith(3, 3);

    const negative = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: -1,
      actorName: "Player1",
    });
    expect(negative.state).toEqual(room);
    expect(negative.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "InvalidBid" },
    ]);

    const tooHigh = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 4,
      actorName: "Player1",
    });
    expect(tooHigh.state).toEqual(room);
    expect(tooHigh.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "InvalidBid" },
    ]);

    const nonInteger = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1.5,
      actorName: "Player1",
    });
    expect(nonInteger.state).toEqual(room);
    expect(nonInteger.events).toEqual([
      { type: "SubmitBidRejected", roomCode: "ABCD", reason: "InvalidBid" },
    ]);
  });
});

describe("areAllBidsSubmitted", () => {
  it("is false until every Player has bid, then flips true the moment the last one does", () => {
    const room = activeRoomWith(3, 3);
    expect(areAllBidsSubmitted(room)).toBe(false);

    const afterFirst = submitBid(room, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 1,
      actorName: "Player1",
    }).state;
    expect(areAllBidsSubmitted(afterFirst as RoomState)).toBe(false);

    const afterSecond = submitBid(afterFirst, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 0,
      actorName: "Player2",
    }).state;
    expect(areAllBidsSubmitted(afterSecond as RoomState)).toBe(false);

    const afterThird = submitBid(afterSecond, {
      type: "SubmitBid",
      roomCode: "ABCD",
      bid: 2,
      actorName: "Player3",
    }).state;
    expect(areAllBidsSubmitted(afterThird as RoomState)).toBe(true);
  });

  it("is false for a Room with no Players", () => {
    const room = activeRoomWith(3, 3);
    expect(areAllBidsSubmitted({ ...room, players: [] })).toBe(false);
  });
});
