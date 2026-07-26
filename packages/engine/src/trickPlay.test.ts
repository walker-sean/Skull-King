import { describe, expect, it } from "vitest";
import type { Card, Player, RoomState, Suit } from "@skull-king/shared";
import { currentTurnPlayerName, playCard } from "./trickPlay.js";

function suited(suit: Suit, rank: number): Card {
  return { kind: "Suited", suit, rank };
}

function playerWith(name: string, hand: Card[], isHost = false): Player {
  return {
    name,
    isHost,
    connected: true,
    hand,
    bid: 0,
    tricksWon: 0,
    score: 0,
  };
}

function activeRoom(
  players: Player[],
  leaderName = players[0]?.name ?? null,
): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players,
    scoringMode: "Traditional",
    currentRound: players[0]?.hand.length ?? 1,
    currentTrick: [],
    trickLeader: leaderName,
    alliances: [],
    remainingDeck: [],
    pendingPirateAbility: null,
    pirateBets: [],
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
      playerWith(
        "Alice",
        [suited("Parrot", 5), suited("TreasureChest", 1)],
        true,
      ),
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
    expect(result.state?.players.find((p) => p.name === "Alice")?.hand).toEqual(
      [suited("TreasureChest", 1)],
    );
    expect(result.events).toEqual([
      {
        type: "CardPlayed",
        roomCode: "ABCD",
        playerName: "Alice",
        card: suited("Parrot", 5),
      },
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
    const players = [
      playerWith("Alice", [suited("Parrot", 5)], true),
      playerWith("Bob", []),
    ];
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
      {
        type: "PlayCardRejected",
        roomCode: "ABCD",
        reason: "BiddingIncomplete",
      },
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
    const pirate: Card = { kind: "Pirate", name: "RosieDLaney" };
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
        {
          type: "PlayCardRejected",
          roomCode: "ABCD",
          reason: "InvalidTigressDeclaration",
        },
      ]);
    });
  });

  describe("Advanced Cards: Loot/Alliance, Kraken, White Whale", () => {
    function playFullTrick(playerHands: [string, Card][]): {
      result: ReturnType<typeof playCard>;
      room: RoomState;
    } {
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
      room = (result.state as RoomState) ?? room;
      for (let i = 1; i < playerHands.length; i++) {
        result = playCard(room, {
          type: "PlayCard",
          roomCode: "ABCD",
          card: playerHands[i]![1],
          actorName: playerHands[i]![0],
        });
        room = (result.state as RoomState) ?? room;
      }
      return { result, room };
    }

    const loot: Card = { kind: "Loot" };
    const kraken: Card = { kind: "Kraken" };
    const whiteWhale: Card = { kind: "WhiteWhale" };
    const escape: Card = { kind: "Escape" };
    const pirate: Card = { kind: "Pirate", name: "RosieDLaney" };
    const skullKing: Card = { kind: "SkullKing" };

    describe("Loot / Alliance", () => {
      it("forms an Alliance between the Loot's Player and whoever wins the Trick", () => {
        const { result, room } = playFullTrick([
          ["Alice", loot],
          ["Bob", suited("Parrot", 5)],
        ]);

        expect(result.events).toContainEqual({
          type: "TrickWon",
          roomCode: "ABCD",
          winnerName: "Bob",
        });
        expect(result.events).toContainEqual({
          type: "AllianceFormed",
          roomCode: "ABCD",
          lootPlayerName: "Alice",
          winnerName: "Bob",
        });
        expect(room.alliances).toEqual([
          { round: 1, lootPlayerName: "Alice", winnerName: "Bob" },
        ]);
      });

      it("forms no Alliance when the Loot's Player wins their own Trick (every other card is an Escape)", () => {
        const { result, room } = playFullTrick([
          ["Alice", loot],
          ["Bob", escape],
        ]);

        expect(result.events).toContainEqual({
          type: "TrickWon",
          roomCode: "ABCD",
          winnerName: "Alice",
        });
        expect(result.events).not.toContainEqual(
          expect.objectContaining({ type: "AllianceFormed" }),
        );
        expect(room.alliances).toEqual([]);
      });

      it("forms a separate Alliance for each Loot Player when more than one Loot is played into the Trick", () => {
        const { result, room } = playFullTrick([
          ["Alice", loot],
          ["Bob", loot],
          ["Carol", suited("Parrot", 9)],
        ]);

        expect(result.events).toContainEqual({
          type: "TrickWon",
          roomCode: "ABCD",
          winnerName: "Carol",
        });
        expect(result.events).toContainEqual({
          type: "AllianceFormed",
          roomCode: "ABCD",
          lootPlayerName: "Alice",
          winnerName: "Carol",
        });
        expect(result.events).toContainEqual({
          type: "AllianceFormed",
          roomCode: "ABCD",
          lootPlayerName: "Bob",
          winnerName: "Carol",
        });
        expect(room.alliances).toHaveLength(2);
      });
    });

    describe("Kraken", () => {
      it("voids the Trick entirely, and whoever would have won leads the next Trick", () => {
        const { result, room } = playFullTrick([
          ["Alice", suited("Parrot", 5)],
          ["Bob", kraken],
          ["Carol", suited("Parrot", 9)],
        ]);

        expect(result.events).not.toContainEqual(
          expect.objectContaining({ type: "TrickWon" }),
        );
        expect(result.events).toContainEqual({
          type: "TrickVoided",
          roomCode: "ABCD",
          voidedBy: "Kraken",
          nextLeaderName: "Carol",
        });
        expect(room.currentTrick).toEqual([]);
        expect(room.trickLeader).toBe("Carol");
      });
    });

    describe("White Whale", () => {
      it("strips every card's Special-Card identity and Suit so the highest number wins", () => {
        // Matches the rulebook's worked example (docs/rules/rulebook.md).
        const { result } = playFullTrick([
          ["Thomas", suited("JollyRoger", 2)],
          ["Bill", pirate],
          ["Susan", suited("TreasureChest", 14)],
          ["Lori", skullKing],
          ["Charlie", whiteWhale],
        ]);

        expect(result.events).toContainEqual({
          type: "TrickWon",
          roomCode: "ABCD",
          winnerName: "Susan",
        });
      });

      it("voids the Trick, with whoever would have won leading next, when no Suited card was played", () => {
        const { result, room } = playFullTrick([
          ["Alice", pirate],
          ["Bob", whiteWhale],
          ["Carol", skullKing],
        ]);

        expect(result.events).not.toContainEqual(
          expect.objectContaining({ type: "TrickWon" }),
        );
        expect(result.events).toContainEqual({
          type: "TrickVoided",
          roomCode: "ABCD",
          voidedBy: "WhiteWhale",
          nextLeaderName: "Carol",
        });
        expect(room.trickLeader).toBe("Carol");
      });
    });

    describe("Kraken and White Whale precedence", () => {
      it("applies the White Whale's strip effect when it was played after the Kraken", () => {
        const { result } = playFullTrick([
          ["Alice", kraken],
          ["Bob", whiteWhale],
          ["Carol", suited("Parrot", 5)],
          ["Dave", suited("Parrot", 9)],
        ]);

        expect(result.events).toContainEqual({
          type: "TrickWon",
          roomCode: "ABCD",
          winnerName: "Dave",
        });
        expect(result.events).not.toContainEqual(
          expect.objectContaining({ type: "TrickVoided" }),
        );
      });

      it("applies the Kraken's void effect when it was played after the White Whale", () => {
        const { result, room } = playFullTrick([
          ["Alice", whiteWhale],
          ["Bob", kraken],
          ["Carol", suited("Parrot", 5)],
          ["Dave", suited("Parrot", 9)],
        ]);

        expect(result.events).not.toContainEqual(
          expect.objectContaining({ type: "TrickWon" }),
        );
        expect(result.events).toContainEqual({
          type: "TrickVoided",
          roomCode: "ABCD",
          voidedBy: "Kraken",
          nextLeaderName: "Dave",
        });
        expect(room.trickLeader).toBe("Dave");
      });
    });
  });

  describe("Round scoring", () => {
    it("scores the Round and raises RoundScored once every Player's hand is empty", () => {
      const players = [
        { ...playerWith("Alice", [suited("Parrot", 5)], true), bid: 1 },
        { ...playerWith("Bob", [suited("Parrot", 2)]), bid: 0 },
      ];
      const room = activeRoom(players);

      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 5),
        actorName: "Alice",
      });
      const final = playCard(result.state as RoomState, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 2),
        actorName: "Bob",
      });

      expect(final.events).toContainEqual({
        type: "RoundScored",
        roomCode: "ABCD",
        round: 1,
        scores: [
          {
            playerName: "Alice",
            bidPoints: 20,
            allianceBonus: 0,
            roundPoints: 20,
            totalScore: 20,
          },
          {
            playerName: "Bob",
            bidPoints: 10,
            allianceBonus: 0,
            roundPoints: 10,
            totalScore: 10,
          },
        ],
      });
      expect(final.state?.players.find((p) => p.name === "Alice")?.score).toBe(
        20,
      );
      expect(final.state?.players.find((p) => p.name === "Bob")?.score).toBe(
        10,
      );
    });

    it("does not raise RoundScored or touch scores while the Round is still in progress", () => {
      const players = [
        {
          ...playerWith(
            "Alice",
            [suited("Parrot", 5), suited("Parrot", 1)],
            true,
          ),
          bid: 2,
        },
        {
          ...playerWith("Bob", [suited("Parrot", 2), suited("Parrot", 9)]),
          bid: 0,
        },
      ];
      const room = activeRoom(players);

      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 5),
        actorName: "Alice",
      });
      const afterFirstTrick = playCard(result.state as RoomState, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 2),
        actorName: "Bob",
      });

      expect(afterFirstTrick.events).not.toContainEqual(
        expect.objectContaining({ type: "RoundScored" }),
      );
      expect(afterFirstTrick.state?.players.every((p) => p.score === 0)).toBe(
        true,
      );
    });

    it("pays the Alliance bonus into RoundScored once both Allied Players hit their Bid", () => {
      const loot: Card = { kind: "Loot" };
      const players = [
        {
          ...playerWith("Alice", [loot, suited("Parrot", 14)], true),
          bid: 1,
        },
        {
          ...playerWith("Bob", [suited("Parrot", 5), suited("Parrot", 3)]),
          bid: 1,
        },
      ];
      const room = activeRoom(players);

      // Trick 1: Alice's Loot loses to Bob's Suited card, forming an Alliance (Alice/Bob).
      const afterAlice1 = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: loot,
        actorName: "Alice",
      });
      const afterTrick1 = playCard(afterAlice1.state as RoomState, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 5),
        actorName: "Bob",
      });
      expect(afterTrick1.events).toContainEqual({
        type: "AllianceFormed",
        roomCode: "ABCD",
        lootPlayerName: "Alice",
        winnerName: "Bob",
      });

      // Trick 2: Bob (who won Trick 1) leads; Alice's high card wins, finishing the Round
      // with both Players at their Bid.
      const afterBob2 = playCard(afterTrick1.state as RoomState, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 3),
        actorName: "Bob",
      });
      const final = playCard(afterBob2.state as RoomState, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 14),
        actorName: "Alice",
      });

      expect(final.events).toContainEqual({
        type: "RoundScored",
        roomCode: "ABCD",
        round: 2,
        scores: [
          {
            playerName: "Alice",
            bidPoints: 20,
            allianceBonus: 20,
            roundPoints: 40,
            totalScore: 40,
          },
          {
            playerName: "Bob",
            bidPoints: 20,
            allianceBonus: 20,
            roundPoints: 40,
            totalScore: 40,
          },
        ],
      });
    });
  });

  describe("Advanced Pirate Ability unlock-gating", () => {
    function playFullTrick(playerHands: [string, Card][]): {
      result: ReturnType<typeof playCard>;
      room: RoomState;
    } {
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
      room = (result.state as RoomState) ?? room;
      for (let i = 1; i < playerHands.length; i++) {
        result = playCard(room, {
          type: "PlayCard",
          roomCode: "ABCD",
          card: playerHands[i]![1],
          actorName: playerHands[i]![0],
        });
        room = (result.state as RoomState) ?? room;
      }
      return { result, room };
    }

    it("unlocks the named Pirate's Ability for the Trick's winner", () => {
      const { result, room } = playFullTrick([
        ["Alice", { kind: "Escape" }],
        ["Bob", { kind: "Pirate", name: "RosieDLaney" }],
      ]);

      expect(result.events).toContainEqual({
        type: "PirateAbilityUnlocked",
        roomCode: "ABCD",
        playerName: "Bob",
        pirateName: "RosieDLaney",
      });
      expect(room.pendingPirateAbility).toEqual({
        playerName: "Bob",
        pirateName: "RosieDLaney",
      });
    });

    it("does not unlock an Ability when the winning card wasn't a named Pirate", () => {
      const { result, room } = playFullTrick([
        ["Alice", { kind: "Escape" }],
        ["Bob", { kind: "SkullKing" }],
      ]);

      expect(result.events).not.toContainEqual(
        expect.objectContaining({ type: "PirateAbilityUnlocked" }),
      );
      expect(room.pendingPirateAbility).toBeNull();
    });

    it("does not unlock an Ability for a Pirate that only shared the Trick, not won it", () => {
      const { room } = playFullTrick([
        ["Alice", { kind: "Pirate", name: "HarryTheGiant" }],
        ["Bob", { kind: "SkullKing" }],
      ]);

      expect(room.pendingPirateAbility).toBeNull();
    });

    it("a Voided Trick leaves no pending Ability behind, since a Kraken/Whale void never unlocks one", () => {
      const { room } = playFullTrick([
        ["Alice", { kind: "Kraken" }],
        ["Bob", { kind: "Escape" }],
      ]);

      expect(room.pendingPirateAbility).toBeNull();
    });

    it("rejects playing a card while an unlocked Ability is still pending invocation", () => {
      const players = [
        playerWith("Alice", [suited("Parrot", 5)], true),
        playerWith("Bob", [suited("Parrot", 3)]),
      ];
      const room = {
        ...activeRoom(players),
        pendingPirateAbility: {
          playerName: "Bob",
          pirateName: "RosieDLaney" as const,
        },
      };

      const result = playCard(room, {
        type: "PlayCard",
        roomCode: "ABCD",
        card: suited("Parrot", 5),
        actorName: "Alice",
      });

      expect(result.state).toEqual(room);
      expect(result.events).toEqual([
        {
          type: "PlayCardRejected",
          roomCode: "ABCD",
          reason: "PirateAbilityPending",
        },
      ]);
    });
  });
});
