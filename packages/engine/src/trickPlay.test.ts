import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState, Suit } from "@skull-king/shared";
import { currentTurnPlayerName, playCard } from "./trickPlay.js";

function suited(suit: Suit, rank: number): Card {
  return { kind: "Suited", suit, rank };
}

function playerWith(name: string, hand: Card[], isHost = false): Player {
  return { name, isHost, connected: true, hand, bid: 0 };
}

function activeRoom(players: Player[], leaderName = players[0]?.name ?? null): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players,
    scoringMode: "Traditional",
    currentRound: players[0]?.hand.length ?? 1,
    currentTrick: [],
    trickLeader: leaderName,
  };
}

describe("currentTurnPlayerName", () => {
  it("starts with the Trick's leader and advances by how many cards have been played", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 1)], true),
      playerWith("Bob", [suited("Parrot", 2)]),
      playerWith("Carol", [suited("Parrot", 3)]),
    ];
    const room = activeRoom(players, "Bob");

    expect(currentTurnPlayerName(room)).toBe("Bob");
    expect(
      currentTurnPlayerName({
        ...room,
        currentTrick: [{ playerName: "Bob", card: suited("Parrot", 2) }],
      }),
    ).toBe("Carol");
    expect(
      currentTurnPlayerName({
        ...room,
        currentTrick: [
          { playerName: "Bob", card: suited("Parrot", 2) },
          { playerName: "Carol", card: suited("Parrot", 3) },
        ],
      }),
    ).toBe("Alice");
  });
});

describe("playCard", () => {
  it("records the play, removes the card from the Player's hand, and confirms it with a CardPlayed event", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 5), suited("TreasureChest", 1)], true),
      playerWith("Bob", [suited("Parrot", 3)]),
    ];
    const room = activeRoom(players);

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("Parrot", 5),
      actorName: "Alice",
    });

    expect(result.state?.currentTrick).toEqual([
      { playerName: "Alice", card: suited("Parrot", 5) },
    ]);
    expect(result.state?.players.find((p) => p.name === "Alice")?.hand).toEqual([
      suited("TreasureChest", 1),
    ]);
    expect(result.events).toEqual([
      { type: "CardPlayed", roomCode: "ABCD", playerName: "Alice", card: suited("Parrot", 5) },
    ]);
  });

  it("rejects a play from anyone other than the Player whose turn it is", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 5)], true),
      playerWith("Bob", [suited("Parrot", 3)]),
    ];
    const room = activeRoom(players);

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("Parrot", 3),
      actorName: "Bob",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "PlayCardRejected", roomCode: "ABCD", reason: "NotYourTurn" },
    ]);
  });

  it("rejects playing a card the Player doesn't hold", () => {
    const players = [playerWith("Alice", [suited("Parrot", 5)], true), playerWith("Bob", [])];
    const room = activeRoom(players);

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("Parrot", 9),
      actorName: "Alice",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "PlayCardRejected", roomCode: "ABCD", reason: "CardNotInHand" },
    ]);
  });

  it("enforces following the led Suit when the Player holds one", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 5)], true),
      playerWith("Bob", [suited("Parrot", 2), suited("TreasureChest", 9)]),
    ];
    const room = {
      ...activeRoom(players),
      currentTrick: [{ playerName: "Alice", card: suited("Parrot", 5) }],
    };

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("TreasureChest", 9),
      actorName: "Bob",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "PlayCardRejected", roomCode: "ABCD", reason: "MustFollowSuit" },
    ]);
  });

  it("allows a Special Card even when the Player holds a card of the led Suit", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 5)], true),
      playerWith("Bob", [suited("Parrot", 2), { kind: "Escape" }]),
    ];
    const room = {
      ...activeRoom(players),
      currentTrick: [{ playerName: "Alice", card: suited("Parrot", 5) }],
    };

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: { kind: "Escape" },
      actorName: "Bob",
    });

    expect(result.events).toContainEqual({
      type: "CardPlayed",
      roomCode: "ABCD",
      playerName: "Bob",
      card: { kind: "Escape" },
    });
  });

  it("allows an off-Suit play when the Player holds none of the led Suit", () => {
    const players = [
      playerWith("Alice", [suited("Parrot", 5)], true),
      playerWith("Bob", [suited("TreasureChest", 9)]),
    ];
    const room = {
      ...activeRoom(players),
      currentTrick: [{ playerName: "Alice", card: suited("Parrot", 5) }],
    };

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("TreasureChest", 9),
      actorName: "Bob",
    });

    expect(result.events).toContainEqual({
      type: "CardPlayed",
      roomCode: "ABCD",
      playerName: "Bob",
      card: suited("TreasureChest", 9),
    });
  });

  it("rejects a play before every Player has submitted a Bid", () => {
    const players = [
      { ...playerWith("Alice", [suited("Parrot", 5)], true), bid: null },
      playerWith("Bob", [suited("Parrot", 3)]),
    ];
    const room = activeRoom(players);

    const result = playCard(room, {
      type: "PlayCard",
      roomCode: "ABCD",
      card: suited("Parrot", 5),
      actorName: "Alice",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "PlayCardRejected", roomCode: "ABCD", reason: "BiddingIncomplete" },
    ]);
  });

  it("rejects a play on a Room Code with no matching Room", () => {
    const result = playCard(null, {
      type: "PlayCard",
      roomCode: "ZZZZ",
      card: suited("Parrot", 5),
      actorName: "Alice",
    });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([
      { type: "PlayCardRejected", roomCode: "ZZZZ", reason: "RoomNotFound" },
    ]);
  });

  describe("plain-card capture resolution", () => {
    it("resolves a Trick of only Suited cards to the highest card of the led Suit", () => {
      const players = [
        playerWith("Alice", [suited("Parrot", 5)], true),
        playerWith("Bob", [suited("Parrot", 9)]),
        playerWith("Carol", [suited("TreasureChest", 14)]),
      ];
      let room = activeRoom(players);

      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 5),
        actorName: "Alice",
      }).state as RoomState;
      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 9),
        actorName: "Bob",
      }).state as RoomState;
      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("TreasureChest", 14),
        actorName: "Carol",
      });

      expect(result.events).toContainEqual({
        type: "TrickWon",
        roomCode: "ABCD",
        winnerName: "Bob",
      });
      expect(result.state?.currentTrick).toEqual([]);
      expect(result.state?.trickLeader).toBe("Bob");
    });

    it("resolves a Trick with Trump played to the highest Trump card, even over a higher-numbered led Suit card", () => {
      const players = [
        playerWith("Alice", [suited("Parrot", 14)], true),
        playerWith("Bob", [suited("JollyRoger", 2)]),
        playerWith("Carol", [suited("Parrot", 10)]),
      ];
      let room = activeRoom(players);

      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 14),
        actorName: "Alice",
      }).state as RoomState;
      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("JollyRoger", 2),
        actorName: "Bob",
      }).state as RoomState;
      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 10),
        actorName: "Carol",
      });

      expect(result.events).toContainEqual({
        type: "TrickWon",
        roomCode: "ABCD",
        winnerName: "Bob",
      });
      expect(result.state?.trickLeader).toBe("Bob");
    });

    it("resolves a Trick led by Trump to the highest Trump card played", () => {
      const players = [
        playerWith("Alice", [suited("JollyRoger", 4)], true),
        playerWith("Bob", [suited("JollyRoger", 12)]),
        playerWith("Carol", [suited("JollyRoger", 1)]),
      ];
      let room = activeRoom(players);

      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("JollyRoger", 4),
        actorName: "Alice",
      }).state as RoomState;
      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("JollyRoger", 12),
        actorName: "Bob",
      }).state as RoomState;
      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("JollyRoger", 1),
        actorName: "Carol",
      });

      expect(result.events).toContainEqual({
        type: "TrickWon",
        roomCode: "ABCD",
        winnerName: "Bob",
      });
    });

    it("the Trick's winner leads the next Trick", () => {
      const players = [
        playerWith("Alice", [suited("Parrot", 1), suited("Parrot", 8)], true),
        playerWith("Bob", [suited("Parrot", 9), suited("TreasureChest", 1)]),
        playerWith("Carol", [suited("Parrot", 2), suited("TreasureChest", 2)]),
      ];
      let room = activeRoom(players);

      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 1),
        actorName: "Alice",
      }).state as RoomState;
      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 9),
        actorName: "Bob",
      }).state as RoomState;
      room = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 2),
        actorName: "Carol",
      }).state as RoomState;

      expect(room.trickLeader).toBe("Bob");
      expect(currentTurnPlayerName(room)).toBe("Bob");

      const second = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("TreasureChest", 1),
        actorName: "Bob",
      });

      expect(second.events).toEqual([
        {
          type: "CardPlayed",
          roomCode: "ABCD",
          playerName: "Bob",
          card: suited("TreasureChest", 1),
        },
      ]);
    });
  });
});
