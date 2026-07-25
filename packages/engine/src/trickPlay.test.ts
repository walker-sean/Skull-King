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

  describe("full Capture Hierarchy resolution", () => {
    function winnerOf(playerHands: [string, Card][]): string {
      const players = playerHands.map(([name, card], index) =>
        playerWith(name, [card], index === 0),
      );
      let room = activeRoom(players);
      let result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: playerHands[0]![1],
        actorName: playerHands[0]![0],
      });
      room = result.state as RoomState;
      for (let i = 1; i < playerHands.length; i++) {
        result = playCard(room, {
          type: "PlayCard",
          roomCode: "ABCD",
          card: playerHands[i]![1],
          actorName: playerHands[i]![0],
        });
        room = (result.state as RoomState) ?? room;
      }
      const winEvent = result.events.find((event) => event.type === "TrickWon");
      if (winEvent === undefined || winEvent.type !== "TrickWon") {
        throw new Error("Trick did not resolve to a winner");
      }
      return winEvent.winnerName;
    }

    const escape: Card = { kind: "Escape" };
    const pirate: Card = { kind: "Pirate" };
    const skullKing: Card = { kind: "SkullKing" };
    const mermaid: Card = { kind: "Mermaid" };
    const tigressAsPirate: Card = { kind: "Tigress", declaredAs: "Pirate" };
    const tigressAsEscape: Card = { kind: "Tigress", declaredAs: "Escape" };

    it("Escape always loses the Trick it's played into, even to a low Suited card", () => {
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", suited("Parrot", 1)],
        ]),
      ).toBe("Bob");
    });

    it("Escape always loses the Trick it's played into, even to a Pirate, the Skull King, or a Mermaid", () => {
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", pirate],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("the Skull King beats a led-Suit card and a Trump card", () => {
      expect(
        winnerOf([
          ["Alice", suited("Parrot", 14)],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", suited("JollyRoger", 14)],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
    });

    it("a Mermaid beats a led-Suit card and a Trump card", () => {
      expect(
        winnerOf([
          ["Alice", suited("Parrot", 14)],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", suited("JollyRoger", 14)],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("a Pirate beats a led-Suit card", () => {
      expect(
        winnerOf([
          ["Alice", suited("Parrot", 14)],
          ["Bob", pirate],
        ]),
      ).toBe("Bob");
    });

    it("a Pirate beats a Trump card", () => {
      expect(
        winnerOf([
          ["Alice", suited("JollyRoger", 14)],
          ["Bob", pirate],
        ]),
      ).toBe("Bob");
    });

    it("the Skull King beats a Pirate", () => {
      expect(
        winnerOf([
          ["Alice", pirate],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
    });

    it("a Mermaid beats a Pirate", () => {
      expect(
        winnerOf([
          ["Alice", pirate],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("a Mermaid beats the Skull King", () => {
      expect(
        winnerOf([
          ["Alice", skullKing],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("a Mermaid beats a Pirate and the Skull King regardless of play order: Mermaid first", () => {
      expect(
        winnerOf([
          ["Alice", mermaid],
          ["Bob", pirate],
          ["Carol", skullKing],
        ]),
      ).toBe("Alice");
    });

    it("a Mermaid beats a Pirate and the Skull King regardless of play order: Mermaid last", () => {
      expect(
        winnerOf([
          ["Alice", pirate],
          ["Bob", skullKing],
          ["Carol", mermaid],
        ]),
      ).toBe("Carol");
    });

    it("of two Pirates played in the same Trick, the first one played wins", () => {
      expect(
        winnerOf([
          ["Alice", pirate],
          ["Bob", pirate],
        ]),
      ).toBe("Alice");
    });

    it("of two Mermaids played in the same Trick, the first one played wins", () => {
      expect(
        winnerOf([
          ["Alice", mermaid],
          ["Bob", mermaid],
        ]),
      ).toBe("Alice");
    });

    it("when every card played is an Escape, the first one played wins", () => {
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", escape],
        ]),
      ).toBe("Alice");
    });

    it("a Tigress declared as a Pirate beats a Suited card but loses to the Skull King", () => {
      expect(
        winnerOf([
          ["Alice", suited("Parrot", 14)],
          ["Bob", tigressAsPirate],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", tigressAsPirate],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
    });

    it("a Tigress declared as an Escape always loses, even to a low Suited card", () => {
      expect(
        winnerOf([
          ["Alice", tigressAsEscape],
          ["Bob", suited("Parrot", 1)],
        ]),
      ).toBe("Bob");
    });

    it("a Tigress declared as an Escape always loses to a Pirate, the Skull King, or a Mermaid", () => {
      expect(
        winnerOf([
          ["Alice", tigressAsEscape],
          ["Bob", pirate],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", tigressAsEscape],
          ["Bob", skullKing],
        ]),
      ).toBe("Bob");
      expect(
        winnerOf([
          ["Alice", tigressAsEscape],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("a Tigress declared as a Pirate loses to a Mermaid, same as a real Pirate", () => {
      expect(
        winnerOf([
          ["Alice", tigressAsPirate],
          ["Bob", mermaid],
        ]),
      ).toBe("Bob");
    });

    it("a Tigress declared as a Pirate ties with a real Pirate: the first one played wins", () => {
      expect(
        winnerOf([
          ["Alice", tigressAsPirate],
          ["Bob", pirate],
        ]),
      ).toBe("Alice");
      expect(
        winnerOf([
          ["Alice", pirate],
          ["Bob", tigressAsPirate],
        ]),
      ).toBe("Alice");
    });

    it("a Tigress declared as an Escape ties with a real Escape: the first one played wins", () => {
      expect(
        winnerOf([
          ["Alice", tigressAsEscape],
          ["Bob", escape],
        ]),
      ).toBe("Alice");
      expect(
        winnerOf([
          ["Alice", escape],
          ["Bob", tigressAsEscape],
        ]),
      ).toBe("Alice");
    });

    it("rejects playing a Tigress with no declaration", () => {
      const players = [
        playerWith("Alice", [{ kind: "Tigress" }], true),
        playerWith("Bob", [suited("Parrot", 1)]),
      ];
      const room = activeRoom(players);

      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: { kind: "Tigress" },
        actorName: "Alice",
      });

      expect(result.state).toEqual(room);
      expect(result.events).toEqual([
        { type: "PlayCardRejected", roomCode: "ABCD", reason: "InvalidTigressDeclaration" },
      ]);
    });
  });
});
