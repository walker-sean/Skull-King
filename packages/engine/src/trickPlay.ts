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
  if (
    state.trickLeader === null ||
    state.currentTrick === null ||
    state.players.length === 0
  ) {
    return null;
  }
  const leaderIndex = state.players.findIndex(
    (player) => player.name === state.trickLeader,
  );
  if (leaderIndex === -1) {
    return null;
  }
  const turnIndex =
    (leaderIndex + state.currentTrick.length) % state.players.length;
  return state.players[turnIndex]?.name ?? null;
}

/**
 * A card's rank tier in the Capture Hierarchy (see CONTEXT.md): Escape < Suited Cards
 * < Pirate < Skull King < Mermaid. A Tigress resolves to the Pirate or Escape tier based
 * on how it was declared when played. Loot/Kraken/White Whale aren't ranked here — they're
 * Advanced Cards out of this ticket's scope.
 */
function tierOf(card: Card): number {
  switch (card.kind) {
    case "Escape":
      return 0;
    case "Suited":
      return 1;
    case "Pirate":
      return 2;
    case "SkullKing":
      return 3;
    case "Mermaid":
      return 4;
    case "Tigress":
      return card.declaredAs === "Pirate" ? 2 : 0;
    default:
      return -1;
  }
}

/**
 * Ranks two Suited cards against each other: the Trump Suit beats every other Suit
 * regardless of number, and otherwise only the led Suit can win, highest number first.
 * Only called once both cards are known to share the Suited tier.
 */
function compareSuited(
  a: Extract<Card, { kind: "Suited" }>,
  b: Extract<Card, { kind: "Suited" }>,
  led: Suit | null,
): number {
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

/**
 * Ranks two cards under the full Capture Hierarchy (see CONTEXT.md). Cards in the same
 * tier (e.g. two Pirates, both Mermaids, or several Escapes) rank equal here; combined
 * with resolveTrickWinner's reduce — which only replaces the leader on a strictly greater
 * comparison — that means the earliest one played keeps the win, matching the rulebook's
 * tie-break for duplicate Special Cards.
 */
function compareCards(a: Card, b: Card, led: Suit | null): number {
  const aTier = tierOf(a);
  const bTier = tierOf(b);
  if (aTier !== bTier) {
    return aTier - bTier;
  }
  if (a.kind === "Suited" && b.kind === "Suited") {
    return compareSuited(a, b, led);
  }
  return 0;
}

function resolveTrickWinner(trick: readonly TrickPlay[]): string {
  const led = ledSuit(trick);
  return trick.reduce((best, play) =>
    compareCards(play.card, best.card, led) > 0 ? play : best,
  ).playerName;
}

export function playCard(
  state: RoomState | null,
  command: PlayCardCommand,
): EngineResult {
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

  const player = state.players.find(
    (candidate) => candidate.name === command.actorName,
  );
  if (player === undefined) {
    return rejected(state, command.roomCode, "PlayerNotFound");
  }

  if (currentTurnPlayerName(state) !== player.name) {
    return rejected(state, command.roomCode, "NotYourTurn");
  }

  const cardIndex = player.hand.findIndex((card) =>
    cardsEqual(card, command.card),
  );
  if (cardIndex === -1) {
    return rejected(state, command.roomCode, "CardNotInHand");
  }

  // A Tigress must be declared as a Pirate or an Escape at the moment it's played
  // (see CONTEXT.md's Tigress entry) — resolveTrickWinner relies on that declaration.
  if (
    command.card.kind === "Tigress" &&
    command.card.declaredAs !== "Pirate" &&
    command.card.declaredAs !== "Escape"
  ) {
    return rejected(state, command.roomCode, "InvalidTigressDeclaration");
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
    candidate.name === player.name
      ? { ...candidate, hand: remainingHand }
      : candidate,
  );
  const trick: TrickPlay[] = [
    ...state.currentTrick,
    { playerName: player.name, card: command.card },
  ];

  const events: DomainEvent[] = [
    {
      type: "CardPlayed",
      roomCode: command.roomCode,
      playerName: player.name,
      card: command.card,
    },
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
