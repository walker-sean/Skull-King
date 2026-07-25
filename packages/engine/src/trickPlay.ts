import type {
  Card,
  DomainEvent,
  EngineResult,
  PlayCardCommand,
  PlayCardRejectedReason,
  RoomState,
  Suit,
  TrickPlay,
} from "@skull-king/shared";
import { areAllBidsSubmitted } from "./bidding.js";

const TRUMP_SUIT: Suit = "JollyRoger";

function rejected(
  state: RoomState | null,
  roomCode: string,
  reason: PlayCardRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "PlayCardRejected", roomCode, reason }],
  };
}

function cardsEqual(a: Card, b: Card): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "Suited" && b.kind === "Suited") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  return true;
}

function suitOf(card: Card): Suit | null {
  return card.kind === "Suited" ? card.suit : null;
}

function ledSuit(trick: readonly TrickPlay[]): Suit | null {
  const ledCard = trick[0]?.card;
  return ledCard === undefined ? null : suitOf(ledCard);
}

/**
 * Whose turn it is to play into the Trick in progress: the Trick's leader, advanced by
 * however many cards have already been played this Trick (see CONTEXT.md's Trick entry).
 */
export function currentTurnPlayerName(state: RoomState): string | null {
  if (state.trickLeader === null || state.currentTrick === null || state.players.length === 0) {
    return null;
  }
  const leaderIndex = state.players.findIndex((player) => player.name === state.trickLeader);
  if (leaderIndex === -1) {
    return null;
  }
  const turnIndex = (leaderIndex + state.currentTrick.length) % state.players.length;
  return state.players[turnIndex]?.name ?? null;
}

/**
 * Ranks two cards under the plain-card slice of the Capture Hierarchy (see CONTEXT.md):
 * the Trump Suit beats every other Suit regardless of number, and otherwise only the led
 * Suit can win, highest number first. Special Cards aren't ranked here yet — ticket #7 adds
 * the full hierarchy (Escape/Pirate/Skull King/Mermaid), so a non-Suited card never wins
 * a comparison in this ticket's scope.
 */
function comparePlainCards(a: Card, b: Card, led: Suit | null): number {
  const aSuited = a.kind === "Suited";
  const bSuited = b.kind === "Suited";
  if (!aSuited || !bSuited) {
    return (aSuited ? 1 : 0) - (bSuited ? 1 : 0);
  }

  const aIsTrump = a.suit === TRUMP_SUIT;
  const bIsTrump = b.suit === TRUMP_SUIT;
  if (aIsTrump !== bIsTrump) {
    return aIsTrump ? 1 : -1;
  }
  if (aIsTrump && bIsTrump) {
    return a.rank - b.rank;
  }

  const aFollowsLed = a.suit === led;
  const bFollowsLed = b.suit === led;
  if (aFollowsLed !== bFollowsLed) {
    return aFollowsLed ? 1 : -1;
  }
  return aFollowsLed && bFollowsLed ? a.rank - b.rank : 0;
}

function resolveTrickWinner(trick: readonly TrickPlay[]): string {
  const led = ledSuit(trick);
  return trick.reduce((best, play) =>
    comparePlainCards(play.card, best.card, led) > 0 ? play : best,
  ).playerName;
}

export function playCard(state: RoomState | null, command: PlayCardCommand): EngineResult {
  if (state === null) {
    return rejected(null, command.roomCode, "RoomNotFound");
  }

  if (state.status !== "Active") {
    return rejected(state, command.roomCode, "RoomNotActive");
  }

  if (!areAllBidsSubmitted(state)) {
    return rejected(state, command.roomCode, "BiddingIncomplete");
  }

  if (state.currentTrick === null || state.trickLeader === null) {
    return rejected(state, command.roomCode, "BiddingIncomplete");
  }

  const player = state.players.find((candidate) => candidate.name === command.actorName);
  if (player === undefined) {
    return rejected(state, command.roomCode, "PlayerNotFound");
  }

  if (currentTurnPlayerName(state) !== player.name) {
    return rejected(state, command.roomCode, "NotYourTurn");
  }

  const cardIndex = player.hand.findIndex((card) => cardsEqual(card, command.card));
  if (cardIndex === -1) {
    return rejected(state, command.roomCode, "CardNotInHand");
  }

  const led = ledSuit(state.currentTrick);
  const cardSuit = suitOf(command.card);
  // Only a Suited card can violate follow-suit — a Special Card (no Suit) is always
  // legal to play regardless of the led Suit (see CONTEXT.md's Special Card entry).
  if (led !== null && cardSuit !== null && cardSuit !== led) {
    const mustFollow = player.hand.some((card) => suitOf(card) === led);
    if (mustFollow) {
      return rejected(state, command.roomCode, "MustFollowSuit");
    }
  }

  const remainingHand = [
    ...player.hand.slice(0, cardIndex),
    ...player.hand.slice(cardIndex + 1),
  ];
  const players = state.players.map((candidate) =>
    candidate.name === player.name ? { ...candidate, hand: remainingHand } : candidate,
  );
  const trick: TrickPlay[] = [
    ...state.currentTrick,
    { playerName: player.name, card: command.card },
  ];

  const events: DomainEvent[] = [
    { type: "CardPlayed", roomCode: command.roomCode, playerName: player.name, card: command.card },
  ];

  if (trick.length === state.players.length) {
    const winnerName = resolveTrickWinner(trick);
    events.push({ type: "TrickWon", roomCode: command.roomCode, winnerName });
    return {
      state: { ...state, players, currentTrick: [], trickLeader: winnerName },
      events,
    };
  }

  return {
    state: { ...state, players, currentTrick: trick },
    events,
  };
}
