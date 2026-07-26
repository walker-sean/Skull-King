import { describe, expect, it } from "vitest";
import type { Card, PirateName, Player, RoomState } from "@skull-king/shared";
import { invokePirateAbility } from "./pirateAbility.js";

function suited(rank: number): Card {
  return { kind: "Suited", suit: "Parrot", rank };
}

function playerWith(
  name: string,
  hand: Card[],
  bid: number | null,
  isHost = false,
): Player {
  return { name, isHost, connected: true, hand, bid, tricksWon: 0, score: 0 };
}

function roomWithPendingAbility(
  players: Player[],
  pirateName: PirateName,
  winnerName: string,
  remainingDeck: Card[] = [],
): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players,
    scoringMode: "Traditional",
    currentRound: 3,
    currentTrick: [],
    trickLeader: winnerName,
    alliances: [],
    remainingDeck,
    pendingPirateAbility: { playerName: winnerName, pirateName },
    pirateBets: [],
    cardBonuses: [],
    roundScores: [],
    pendingReveal: null,
  };
}

describe("invokePirateAbility", () => {
  describe("unlock-gating", () => {
    it("rejects when no Room matches the code", () => {
      const result = invokePirateAbility(null, {
        type: "InvokePirateAbility",
        roomCode: "ZZZZ",
        effect: { pirateName: "JuanitaJade" },
        actorName: "Alice",
      });

      expect(result.state).toBeNull();
      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ZZZZ",
          reason: "RoomNotFound",
        },
      ]);
    });

    it("rejects when there's no Ability pending", () => {
      const room: RoomState = {
        ...roomWithPendingAbility(
          [playerWith("Alice", [], 2, true)],
          "JuanitaJade",
          "Alice",
        ),
        pendingPirateAbility: null,
      };

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "JuanitaJade" },
        actorName: "Alice",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "NoAbilityPending",
        },
      ]);
    });

    it("rejects invocation by anyone other than the Trick's winner", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true), playerWith("Bob", [], 1)],
        "JuanitaJade",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "JuanitaJade" },
        actorName: "Bob",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "NotYourAbility",
        },
      ]);
    });

    it("rejects an effect that doesn't match the unlocked Pirate", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "JuanitaJade",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "HarryTheGiant", bidAdjustment: 1 },
        actorName: "Alice",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "WrongPirateForEffect",
        },
      ]);
    });
  });

  describe("Rosie D'Laney: choose who leads the next Trick", () => {
    it("sets the chosen Player as the next Trick's leader", () => {
      const room = roomWithPendingAbility(
        [
          playerWith("Alice", [], 2, true),
          playerWith("Bob", [], 1),
          playerWith("Carol", [], 0),
        ],
        "RosieDLaney",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "RosieDLaney", chosenLeaderName: "Carol" },
        actorName: "Alice",
      });

      expect(result.state?.trickLeader).toBe("Carol");
      expect(result.state?.pendingPirateAbility).toBeNull();
      expect(result.events).toContainEqual({
        type: "TrickLeaderChosen",
        roomCode: "ABCD",
        chosenLeaderName: "Carol",
      });
    });

    it("allows choosing yourself to lead", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true), playerWith("Bob", [], 1)],
        "RosieDLaney",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "RosieDLaney", chosenLeaderName: "Alice" },
        actorName: "Alice",
      });

      expect(result.state?.trickLeader).toBe("Alice");
    });

    it("rejects choosing someone who isn't in the Room", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "RosieDLaney",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "RosieDLaney", chosenLeaderName: "Ghost" },
        actorName: "Alice",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "InvalidLeaderChoice",
        },
      ]);
      expect(result.state?.pendingPirateAbility).not.toBeNull();
    });
  });

  describe("Harry the Giant: adjust your own Bid by plus or minus one", () => {
    it("increases the winner's own Bid by one", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1), suited(2), suited(3)], 2, true)],
        "HarryTheGiant",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "HarryTheGiant", bidAdjustment: 1 },
        actorName: "Alice",
      });

      expect(result.state?.players.find((p) => p.name === "Alice")?.bid).toBe(
        3,
      );
      expect(result.state?.pendingPirateAbility).toBeNull();
      expect(result.events).toContainEqual({
        type: "BidAdjusted",
        roomCode: "ABCD",
        playerName: "Alice",
        bid: 3,
      });
    });

    it("decreases the Bid by one, or leaves it unchanged", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1), suited(2)], 1, true)],
        "HarryTheGiant",
        "Alice",
      );

      const decreased = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "HarryTheGiant", bidAdjustment: -1 },
        actorName: "Alice",
      });
      expect(
        decreased.state?.players.find((p) => p.name === "Alice")?.bid,
      ).toBe(0);

      const unchanged = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "HarryTheGiant", bidAdjustment: 0 },
        actorName: "Alice",
      });
      expect(
        unchanged.state?.players.find((p) => p.name === "Alice")?.bid,
      ).toBe(1);
    });

    it("rejects an adjustment that would take the Bid below zero or above the hand size", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1)], 0, true)],
        "HarryTheGiant",
        "Alice",
      );

      const belowZero = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "HarryTheGiant", bidAdjustment: -1 },
        actorName: "Alice",
      });
      expect(belowZero.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "InvalidBidAdjustment",
        },
      ]);

      const aboveHand = invokePirateAbility(
        {
          ...room,
          players: [playerWith("Alice", [suited(1)], 1, true)],
        },
        {
          type: "InvokePirateAbility",
          roomCode: "ABCD",
          effect: { pirateName: "HarryTheGiant", bidAdjustment: 1 },
          actorName: "Alice",
        },
      );
      expect(aboveHand.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "InvalidBidAdjustment",
        },
      ]);
    });
  });

  describe("Bendt the Bandit: draw 2 cards, then discard 2", () => {
    it("draws 2 cards from the remaining Deck and discards 2 chosen cards", () => {
      const drawnCards: Card[] = [{ kind: "Mermaid" }, { kind: "SkullKing" }];
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1), suited(2)], 1, true)],
        "BendtTheBandit",
        "Alice",
        drawnCards,
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: {
          pirateName: "BendtTheBandit",
          discard: [suited(1), { kind: "SkullKing" }],
        },
        actorName: "Alice",
      });

      expect(
        result.state?.players.find((p) => p.name === "Alice")?.hand,
      ).toEqual([suited(2), { kind: "Mermaid" }]);
      expect(result.state?.remainingDeck).toEqual([]);
      expect(result.state?.pendingPirateAbility).toBeNull();
      expect(result.events).toContainEqual({
        type: "CardsExchanged",
        roomCode: "ABCD",
        playerName: "Alice",
        drawn: drawnCards,
        discarded: [suited(1), { kind: "SkullKing" }],
      });
    });

    it("rejects when fewer than 2 cards remain in the Deck", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1)], 1, true)],
        "BendtTheBandit",
        "Alice",
        [{ kind: "Mermaid" }],
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: {
          pirateName: "BendtTheBandit",
          discard: [suited(1), suited(1)],
        },
        actorName: "Alice",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "DeckExhausted",
        },
      ]);
    });

    it("rejects discarding a card the Player doesn't actually hold after drawing", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [suited(1)], 1, true)],
        "BendtTheBandit",
        "Alice",
        [{ kind: "Mermaid" }, { kind: "SkullKing" }],
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: {
          pirateName: "BendtTheBandit",
          discard: [suited(1), { kind: "Kraken" }],
        },
        actorName: "Alice",
      });

      expect(result.events).toEqual([
        {
          type: "InvokePirateAbilityRejected",
          roomCode: "ABCD",
          reason: "InvalidDiscard",
        },
      ]);
      expect(result.state?.pendingPirateAbility).not.toBeNull();
    });
  });

  describe("Rascal of Roatan: bet on hitting your Bid", () => {
    it("records a 10 or 20 point bet for the current Round", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "RascalOfRoatan",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "RascalOfRoatan", bet: 20 },
        actorName: "Alice",
      });

      expect(result.state?.pirateBets).toEqual([
        { round: 3, playerName: "Alice", amount: 20 },
      ]);
      expect(result.state?.pendingPirateAbility).toBeNull();
      expect(result.events).toContainEqual({
        type: "BetPlaced",
        roomCode: "ABCD",
        playerName: "Alice",
        amount: 20,
      });
    });

    it("declining the bet leaves the score unaffected: no bet recorded", () => {
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "RascalOfRoatan",
        "Alice",
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "RascalOfRoatan", bet: 0 },
        actorName: "Alice",
      });

      expect(result.state?.pirateBets).toEqual([]);
      expect(result.state?.pendingPirateAbility).toBeNull();
    });
  });

  describe("Juanita Jade: privately look through the undealt cards", () => {
    it("reveals the remaining Deck to the winner without changing game state", () => {
      const remainingDeck: Card[] = [suited(7), { kind: "Escape" }];
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "JuanitaJade",
        "Alice",
        remainingDeck,
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "JuanitaJade" },
        actorName: "Alice",
      });

      expect(result.state?.remainingDeck).toEqual(remainingDeck);
      expect(result.state?.pendingPirateAbility).toBeNull();
      expect(result.events).toContainEqual({
        type: "UndealtCardsRevealed",
        roomCode: "ABCD",
        playerName: "Alice",
        cards: remainingDeck,
      });
    });

    it("populates pendingReveal for the invoking Player", () => {
      const remainingDeck: Card[] = [suited(7), { kind: "Escape" }];
      const room = roomWithPendingAbility(
        [playerWith("Alice", [], 2, true)],
        "JuanitaJade",
        "Alice",
        remainingDeck,
      );

      const result = invokePirateAbility(room, {
        type: "InvokePirateAbility",
        roomCode: "ABCD",
        effect: { pirateName: "JuanitaJade" },
        actorName: "Alice",
      });

      expect(result.state?.pendingReveal).toEqual({
        playerName: "Alice",
        cards: remainingDeck,
      });
    });
  });
});
