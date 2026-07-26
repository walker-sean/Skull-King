import type {
  Card,
  DomainEvent,
  EngineResult,
  InvokePirateAbilityCommand,
  InvokePirateAbilityRejectedReason,
  RoomState,
} from "@skull-king/shared";
import { cardsEqual } from "./trickPlay.js";

function rejected(
  state: RoomState | null,
  roomCode: string,
  reason: InvokePirateAbilityRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "InvokePirateAbilityRejected", roomCode, reason }],
  };
}

/**
 * Removes the first occurrence of each wanted Card from a hand, matching by identity
 * (see cardsEqual). Returns null if any wanted Card isn't actually held — used to validate
 * Bendt the Bandit's discard before mutating any state (see CONTEXT.md's Advanced Pirate
 * Ability entry).
 */
function removeCards(
  hand: readonly Card[],
  wanted: readonly Card[],
): Card[] | null {
  let remaining = [...hand];
  for (const card of wanted) {
    const index = remaining.findIndex((held) => cardsEqual(held, card));
    if (index === -1) {
      return null;
    }
    remaining = [...remaining.slice(0, index), ...remaining.slice(index + 1)];
  }
  return remaining;
}

export function invokePirateAbility(
  state: RoomState | null,
  command: InvokePirateAbilityCommand,
): EngineResult {
  if (state === null) {
    return rejected(null, command.roomCode, "RoomNotFound");
  }

  if (state.status !== "Active") {
    return rejected(state, command.roomCode, "RoomNotActive");
  }

  const player = state.players.find(
    (candidate) => candidate.name === command.actorName,
  );
  if (player === undefined) {
    return rejected(state, command.roomCode, "PlayerNotFound");
  }

  const pending = state.pendingPirateAbility;
  if (pending === null) {
    return rejected(state, command.roomCode, "NoAbilityPending");
  }

  if (pending.playerName !== player.name) {
    return rejected(state, command.roomCode, "NotYourAbility");
  }

  const { effect } = command;
  if (effect.pirateName !== pending.pirateName) {
    return rejected(state, command.roomCode, "WrongPirateForEffect");
  }

  const events: DomainEvent[] = [];

  switch (effect.pirateName) {
    case "RosieDLaney": {
      const chosenLeader = state.players.find(
        (candidate) => candidate.name === effect.chosenLeaderName,
      );
      if (chosenLeader === undefined) {
        return rejected(state, command.roomCode, "InvalidLeaderChoice");
      }
      events.push({
        type: "TrickLeaderChosen",
        roomCode: command.roomCode,
        chosenLeaderName: chosenLeader.name,
      });
      return {
        state: {
          ...state,
          trickLeader: chosenLeader.name,
          pendingPirateAbility: null,
          pendingReveal: null,
        },
        events,
      };
    }

    case "HarryTheGiant": {
      if (player.bid === null) {
        return rejected(state, command.roomCode, "InvalidBidAdjustment");
      }
      const newBid = player.bid + effect.bidAdjustment;
      if (newBid < 0 || newBid > player.hand.length) {
        return rejected(state, command.roomCode, "InvalidBidAdjustment");
      }
      events.push({
        type: "BidAdjusted",
        roomCode: command.roomCode,
        playerName: player.name,
        bid: newBid,
      });
      return {
        state: {
          ...state,
          players: state.players.map((candidate) =>
            candidate.name === player.name
              ? { ...candidate, bid: newBid }
              : candidate,
          ),
          pendingPirateAbility: null,
          pendingReveal: null,
        },
        events,
      };
    }

    case "BendtTheBandit": {
      if (state.remainingDeck.length < 2) {
        return rejected(state, command.roomCode, "DeckExhausted");
      }
      const drawn = state.remainingDeck.slice(0, 2);
      const remainingDeck = state.remainingDeck.slice(2);
      const handAfterDraw = [...player.hand, ...drawn];
      const handAfterDiscard = removeCards(handAfterDraw, effect.discard);
      if (handAfterDiscard === null) {
        return rejected(state, command.roomCode, "InvalidDiscard");
      }
      events.push({
        type: "CardsExchanged",
        roomCode: command.roomCode,
        playerName: player.name,
        drawn,
        discarded: effect.discard,
      });
      return {
        state: {
          ...state,
          remainingDeck,
          players: state.players.map((candidate) =>
            candidate.name === player.name
              ? { ...candidate, hand: handAfterDiscard }
              : candidate,
          ),
          pendingPirateAbility: null,
          pendingReveal: null,
        },
        events,
      };
    }

    case "RascalOfRoatan": {
      events.push({
        type: "BetPlaced",
        roomCode: command.roomCode,
        playerName: player.name,
        amount: effect.bet,
      });
      const pirateBets =
        effect.bet === 0
          ? state.pirateBets
          : [
              ...state.pirateBets,
              {
                round: state.currentRound ?? 0,
                playerName: player.name,
                amount: effect.bet,
              },
            ];
      return {
        state: {
          ...state,
          pirateBets,
          pendingPirateAbility: null,
          pendingReveal: null,
        },
        events,
      };
    }

    case "JuanitaJade": {
      events.push({
        type: "UndealtCardsRevealed",
        roomCode: command.roomCode,
        playerName: player.name,
        cards: state.remainingDeck,
      });
      return {
        state: {
          ...state,
          pendingPirateAbility: null,
          pendingReveal: { playerName: player.name, cards: state.remainingDeck },
        },
        events,
      };
    }
  }
}
