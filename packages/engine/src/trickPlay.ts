import type {
  Card,
  CardBonus,
  DomainEvent,
  EngineResult,
  Player,
  PlayCardCommand,
  PlayCardRejectedReason,
  RoomState,
  Suit,
  TrickPlay,
  TrickVoidingCard,
} from "@skull-king/shared";
import { areAllBidsSubmitted } from "./bidding.js";
import { captureBonusPoints } from "./bonusPoints.js";
import { scoreRound } from "./scoring.js";
import { scoreRascalRound } from "./rascalScoring.js";

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

export function cardsEqual(a: Card, b: Card): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "Suited" && b.kind === "Suited") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  if (a.kind === "Pirate" && b.kind === "Pirate") {
    return a.name === b.name;
  }
  return true;
}

function suitOf(card: Card): Suit | null {
  return card.kind === "Suited" ? card.suit : null;
}

/**
 * The Trick's led Suit: a Special Card has no Suit, so when one leads, there's nothing to
 * follow until the first Suited card played sets it (see CONTEXT.md's Loot entry — "if a
 * Loot card leads the trick, the next suited card played sets the lead suit").
 */
function ledSuit(trick: readonly TrickPlay[]): Suit | null {
  const firstSuited = trick.find((play) => play.card.kind === "Suited");
  return firstSuited === undefined ? null : suitOf(firstSuited.card);
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
 * A card's rank tier in the Capture Hierarchy (see CONTEXT.md): Escape < Loot < Suited Cards
 * < Pirate < Skull King < Mermaid. A Tigress resolves to the Pirate or Escape tier based on
 * how it was declared when played. Loot plays as an Escape but ranks just above a plain
 * Escape (or Tigress-as-Escape), so a Trick of nothing but Escapes and a Loot is won by the
 * Loot's Player — matching the rulebook's "if every other card is an Escape, the Loot player
 * wins" rule — while any Suited or higher card still beats it. Kraken and White Whale aren't
 * capturing cards at all — they only ever affect the whole Trick's resolution (see
 * resolveTrick) — so they can never themselves win a comparison.
 */
function tierOf(card: Card): number {
  switch (card.kind) {
    case "Escape":
      return 0;
    case "Loot":
      return 0.5;
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
 * with capturePlayerName's reduce — which only replaces the leader on a strictly greater
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

function capturePlayerName(trick: readonly TrickPlay[]): string {
  const led = ledSuit(trick);
  return trick.reduce((best, play) =>
    compareCards(play.card, best.card, led) > 0 ? play : best,
  ).playerName;
}

/**
 * Under a White Whale (see CONTEXT.md), every card loses its Special-Card identity and
 * Suit: only Suited cards' numbers count, highest wins, ties keep the earliest played.
 * Returns null when no Suited card was played at all, which itself voids the Trick.
 */
function whaleWinnerName(trick: readonly TrickPlay[]): string | null {
  const numbered = trick.filter(
    (play): play is TrickPlay & { card: { kind: "Suited"; rank: number } } =>
      play.card.kind === "Suited",
  );
  if (numbered.length === 0) {
    return null;
  }
  return numbered.reduce((best, play) =>
    play.card.rank > best.card.rank ? play : best,
  ).playerName;
}

type TrickResolution =
  | { outcome: "Won"; winnerName: string }
  | {
      outcome: "Voided";
      voidedBy: TrickVoidingCard;
      nextLeaderName: string;
    };

/**
 * Resolves a full Trick, including the Advanced Cards (see CONTEXT.md): a Kraken voids the
 * Trick outright, and a White Whale strips every card's identity so only numbers count
 * (itself voiding the Trick if no Suited card was played). When both a Kraken and a White
 * Whale appear in the same Trick, whichever was played second — the later index in play
 * order — determines which effect applies; the other card's effect is entirely overridden,
 * so the Trick falls back to the normal Capture Hierarchy to find whoever "would have won"
 * either for the Kraken's void or for the Alliance/void determination.
 */
function resolveTrick(trick: readonly TrickPlay[]): TrickResolution {
  const krakenIndex = trick.findIndex((play) => play.card.kind === "Kraken");
  const whaleIndex = trick.findIndex((play) => play.card.kind === "WhiteWhale");

  const effect: TrickVoidingCard | null =
    krakenIndex === -1 && whaleIndex === -1
      ? null
      : whaleIndex > krakenIndex
        ? "WhiteWhale"
        : "Kraken";

  if (effect === "Kraken") {
    return {
      outcome: "Voided",
      voidedBy: "Kraken",
      nextLeaderName: capturePlayerName(trick),
    };
  }

  if (effect === "WhiteWhale") {
    const winnerName = whaleWinnerName(trick);
    if (winnerName === null) {
      return {
        outcome: "Voided",
        voidedBy: "WhiteWhale",
        nextLeaderName: capturePlayerName(trick),
      };
    }
    return { outcome: "Won", winnerName };
  }

  return { outcome: "Won", winnerName: capturePlayerName(trick) };
}

/**
 * Once every Player's hand is empty, the Round in progress is over: scores it under the
 * Game's Scoring Mode (see CONTEXT.md's Scoring Mode entry) and folds the result into each
 * Player's running total, raising RoundScored alongside whatever Trick-level events already
 * fired. Otherwise the Round continues unchanged — no scoring happens mid-Round.
 */
function withRoundScoring(
  round: number,
  scoringMode: RoomState["scoringMode"],
  alliances: RoomState["alliances"],
  cardBonuses: RoomState["cardBonuses"],
  pirateBets: RoomState["pirateBets"],
  roomCode: string,
  players: Player[],
  events: DomainEvent[],
): Player[] {
  if (!players.every((player) => player.hand.length === 0)) {
    return players;
  }

  if (scoringMode === "Rascal") {
    const { players: scoredPlayers, scores } = scoreRascalRound(
      round,
      players,
      alliances,
      cardBonuses,
      pirateBets,
    );
    events.push({ type: "RoundScored", roomCode, round, scores });
    return scoredPlayers;
  }

  const { players: scoredPlayers, scores } = scoreRound(
    round,
    players,
    alliances,
  );
  events.push({ type: "RoundScored", roomCode, round, scores });
  return scoredPlayers;
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

  // An unlocked Advanced Pirate Ability must take hold before the next Trick begins (see
  // CONTEXT.md's Advanced Pirate Ability entry) — no further cards can be played until it's
  // invoked.
  if (state.pendingPirateAbility !== null) {
    return rejected(state, command.roomCode, "PirateAbilityPending");
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
    const resolution = resolveTrick(trick);

    if (resolution.outcome === "Voided") {
      events.push({
        type: "TrickVoided",
        roomCode: command.roomCode,
        voidedBy: resolution.voidedBy,
        nextLeaderName: resolution.nextLeaderName,
      });
      const finalPlayers = withRoundScoring(
        state.currentRound ?? 0,
        state.scoringMode,
        state.alliances,
        state.cardBonuses,
        state.pirateBets,
        command.roomCode,
        players,
        events,
      );
      return {
        state: {
          ...state,
          players: finalPlayers,
          currentTrick: [],
          trickLeader: resolution.nextLeaderName,
          pendingPirateAbility: null,
        },
        events,
      };
    }

    const winnerName = resolution.winnerName;
    events.push({ type: "TrickWon", roomCode: command.roomCode, winnerName });

    // The Trick's winner takes it (see CONTEXT.md's Trick entry) — tallied per Player so
    // Traditional/Rascal Scoring can compare Tricks taken against Bid once the Round ends.
    const playersAfterTrick = players.map((candidate) =>
      candidate.name === winnerName
        ? { ...candidate, tricksWon: candidate.tricksWon + 1 }
        : candidate,
    );

    // Loot plays as an Escape but forms an Alliance with the Trick's winner, unless the
    // Loot's own Player is the one who won (see CONTEXT.md's Loot and Alliance entries).
    const newAlliances = trick
      .filter(
        (play) => play.card.kind === "Loot" && play.playerName !== winnerName,
      )
      .map((play) => ({
        round: state.currentRound ?? 0,
        lootPlayerName: play.playerName,
        winnerName,
      }));
    for (const alliance of newAlliances) {
      events.push({
        type: "AllianceFormed",
        roomCode: command.roomCode,
        lootPlayerName: alliance.lootPlayerName,
        winnerName: alliance.winnerName,
      });
    }

    // Winning a Trick by playing a named Pirate (not merely capturing a generic Pirate)
    // unlocks that Pirate's Advanced Pirate Ability, usable only by the Player who won
    // (see CONTEXT.md's Pirate and Advanced Pirate Ability entries).
    const winningPlay = trick.find((play) => play.playerName === winnerName);
    const pendingPirateAbility =
      winningPlay !== undefined && winningPlay.card.kind === "Pirate"
        ? { playerName: winnerName, pirateName: winningPlay.card.name }
        : null;
    if (pendingPirateAbility !== null) {
      events.push({
        type: "PirateAbilityUnlocked",
        roomCode: command.roomCode,
        playerName: pendingPirateAbility.playerName,
        pirateName: pendingPirateAbility.pirateName,
      });
    }

    // Whoever wins the Trick captures every card in it, earning any Bonus points those
    // cards are worth (see CONTEXT.md's Bonus entry) — tracked per Round so Rascal Scoring
    // can split it by Outcome once the Round ends.
    const bonusPoints = captureBonusPoints(trick, winnerName);
    const newCardBonuses: CardBonus[] =
      bonusPoints === 0
        ? []
        : [{ round: state.currentRound ?? 0, playerName: winnerName, points: bonusPoints }];

    const finalPlayers = withRoundScoring(
      state.currentRound ?? 0,
      state.scoringMode,
      [...state.alliances, ...newAlliances],
      [...state.cardBonuses, ...newCardBonuses],
      state.pirateBets,
      command.roomCode,
      playersAfterTrick,
      events,
    );

    return {
      state: {
        ...state,
        players: finalPlayers,
        currentTrick: [],
        trickLeader: winnerName,
        alliances: [...state.alliances, ...newAlliances],
        cardBonuses: [...state.cardBonuses, ...newCardBonuses],
        pendingPirateAbility,
      },
      events,
    };
  }

  return {
    state: { ...state, players, currentTrick: trick },
    events,
  };
}
