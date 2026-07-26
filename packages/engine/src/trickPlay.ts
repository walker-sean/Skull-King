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
import { advanceRound, type RoundAdvanceResult } from "./roundAdvance.js";
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
 * Which of a Player's Hand cards are legal to play into the Trick in progress (see
 * CONTEXT.md's Special Card entry): once a led Suit is set, a Player holding it must follow,
 * so only cards matching the led Suit or Special Cards (no Suit) stay legal. Before any Suit
 * is led, or when the Player has none of the led Suit, every card in Hand is legal.
 */
export function legalPlays(
  hand: readonly Card[],
  currentTrick: readonly TrickPlay[],
): Card[] {
  const led = ledSuit(currentTrick);
  if (led === null) {
    return [...hand];
  }
  const mustFollow = hand.some((card) => suitOf(card) === led);
  if (!mustFollow) {
    return [...hand];
  }
  return hand.filter((card) => {
    const suit = suitOf(card);
    return suit === null || suit === led;
  });
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

/** The Trick's winning play under the normal Capture Hierarchy (see compareCards). */
function winningPlay(trick: readonly TrickPlay[]): TrickPlay {
  const led = ledSuit(trick);
  return trick.reduce((best, play) =>
    compareCards(play.card, best.card, led) > 0 ? play : best,
  );
}

function capturePlayerName(trick: readonly TrickPlay[]): string {
  return winningPlay(trick).playerName;
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

/**
 * Which of a Kraken/White Whale (see CONTEXT.md's Advanced Cards) governs a Trick, if
 * either appears: whichever was played second overrides the other, since only one
 * Advanced Card's effect can apply to a given Trick.
 */
function trickVoidingEffect(
  trick: readonly TrickPlay[],
): TrickVoidingCard | null {
  const krakenIndex = trick.findIndex((play) => play.card.kind === "Kraken");
  const whaleIndex = trick.findIndex((play) => play.card.kind === "WhiteWhale");

  if (krakenIndex === -1 && whaleIndex === -1) {
    return null;
  }
  return whaleIndex > krakenIndex ? "WhiteWhale" : "Kraken";
}

/**
 * Why the winning card captured a Trick (see CONTEXT.md's Capture Hierarchy entry), one
 * variant per tier: Escape and Loot at the bottom (a Loot only wins when every other card
 * is an Escape), Suited split into HighestTrump/HighestLead since those are the only two
 * ways a Suited card can ever win (see compareSuited), Pirate and SkullKing next, and
 * Mermaid split by what it overrode — MermaidOverSkullKing takes priority over
 * MermaidOverPirate when a Trick somehow has both, since a Mermaid beats either regardless
 * of play order. A White Whale strips every card's identity, so a numbered win under one
 * gets its own reason rather than being folded into HighestTrump/HighestLead.
 */
export type TrickCaptureReason =
  | { kind: "Escape"; winnerName: string }
  | { kind: "Loot"; winnerName: string }
  | { kind: "HighestTrump"; winnerName: string }
  | { kind: "HighestLead"; winnerName: string }
  | { kind: "Pirate"; winnerName: string }
  | { kind: "SkullKing"; winnerName: string }
  | { kind: "Mermaid"; winnerName: string }
  | { kind: "MermaidOverPirate"; winnerName: string }
  | { kind: "MermaidOverSkullKing"; winnerName: string }
  | { kind: "WhiteWhaleHighestNumber"; winnerName: string };

/**
 * A resolved Trick's outcome as a discriminated fact for consumers who need to know *why*
 * a card won (see CONTEXT.md's Capture Hierarchy entry), not just who won. Kept distinct
 * from a numbered capture reason so a Kraken-voided or White-Whale-voided Trick (see
 * resolveTrick) can be told apart from an actual capture, rather than being forced into a
 * reason shape that implies a card won.
 */
export type TrickCaptureFact =
  | ({ outcome: "Captured" } & TrickCaptureReason)
  | { outcome: "Voided"; voidedBy: TrickVoidingCard };

/**
 * Classifies the card that already won a comparison (per compareCards) into its Capture
 * Hierarchy reason kind. Only called with cards capable of winning outright (tierOf >= 0);
 * Kraken/WhiteWhale are handled by trickCaptureReason before this is ever reached.
 */
function classifyWin(
  card: Card,
  trick: readonly TrickPlay[],
): TrickCaptureReason["kind"] {
  switch (card.kind) {
    case "Escape":
      return "Escape";
    case "Loot":
      return "Loot";
    case "Tigress":
      return card.declaredAs === "Pirate" ? "Pirate" : "Escape";
    case "Suited":
      return card.suit === TRUMP_SUIT ? "HighestTrump" : "HighestLead";
    case "Pirate":
      return "Pirate";
    case "SkullKing":
      return "SkullKing";
    case "Mermaid": {
      const hasSkullKing = trick.some((play) => play.card.kind === "SkullKing");
      if (hasSkullKing) {
        return "MermaidOverSkullKing";
      }
      const hasPirateTier = trick.some(
        (play) =>
          play.card.kind === "Pirate" ||
          (play.card.kind === "Tigress" && play.card.declaredAs === "Pirate"),
      );
      return hasPirateTier ? "MermaidOverPirate" : "Mermaid";
    }
    default:
      throw new Error(`Card kind "${card.kind}" cannot win a Trick`);
  }
}

/**
 * The capture-reason counterpart to resolveTrick: given a resolved Trick, reports not just
 * who won but why (see CONTEXT.md's Capture Hierarchy entry), or that the Trick was voided
 * by a Kraken or an identity-less White Whale instead of captured at all.
 */
export function trickCaptureReason(
  trick: readonly TrickPlay[],
): TrickCaptureFact {
  const effect = trickVoidingEffect(trick);

  if (effect === "Kraken") {
    return { outcome: "Voided", voidedBy: "Kraken" };
  }

  if (effect === "WhiteWhale") {
    const winnerName = whaleWinnerName(trick);
    if (winnerName === null) {
      return { outcome: "Voided", voidedBy: "WhiteWhale" };
    }
    return { outcome: "Captured", kind: "WhiteWhaleHighestNumber", winnerName };
  }

  const winner = winningPlay(trick);
  return {
    outcome: "Captured",
    kind: classifyWin(winner.card, trick),
    winnerName: winner.playerName,
  };
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
  const effect = trickVoidingEffect(trick);

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
 * Game's Scoring Mode (see CONTEXT.md's Scoring Mode entry), folds the result into each
 * Player's running total, and either deals the next Round fresh or — once Round 10 is
 * scored — moves the Room to Completed (see roundAdvance's advanceRound). Raises
 * RoundScored (and GameCompleted, once the Game is over) alongside whatever Trick-level
 * events already fired. Otherwise the Round continues unchanged — no scoring or
 * advancement happens mid-Round, and the Trick in progress's leader/undealt Deck pass
 * through untouched.
 */
/** withRoundScoring's result: RoundAdvanceResult plus the roundScores it accumulated. */
type RoundScoringResult = RoundAdvanceResult & {
  roundScores: RoomState["roundScores"];
};

/** The per-Round accumulator fields withRoundScoring folds a just-finished Round's outcome into. */
interface RoundAccumulators {
  alliances: RoomState["alliances"];
  cardBonuses: RoomState["cardBonuses"];
  pirateBets: RoomState["pirateBets"];
  roundScores: RoomState["roundScores"];
}

function withRoundScoring(
  round: number,
  scoringMode: RoomState["scoringMode"],
  accumulators: RoundAccumulators,
  roomCode: string,
  players: Player[],
  trickInProgress: {
    trickLeader: string;
    remainingDeck: RoomState["remainingDeck"];
  },
  events: DomainEvent[],
): RoundScoringResult {
  const { alliances, cardBonuses, pirateBets, roundScores } = accumulators;

  if (!players.every((player) => player.hand.length === 0)) {
    return {
      players,
      currentRound: round,
      status: "Active",
      trickLeader: trickInProgress.trickLeader,
      remainingDeck: trickInProgress.remainingDeck,
      roundScores,
    };
  }

  const { players: scoredPlayers, scores } =
    scoringMode === "Rascal"
      ? scoreRascalRound(round, players, alliances, cardBonuses, pirateBets)
      : scoreRound(round, players, alliances);
  events.push({ type: "RoundScored", roomCode, round, scores });

  const advanced = advanceRound(round, scoredPlayers);
  if (advanced.status === "Completed") {
    events.push({ type: "GameCompleted", roomCode });
  }
  // scores and roundScores are always both-Traditional or both-Rascal for a Game's lifetime
  // (scoringMode is fixed once the Game starts), even though the union type can't express that.
  return {
    ...advanced,
    roundScores: [...roundScores, ...scores] as RoomState["roundScores"],
  };
}

/** The RoomState fields a just-finished Trick's round-end outcome patches onto state. */
function applyRoundEnd(roundEnd: RoundScoringResult) {
  return {
    players: roundEnd.players,
    currentRound: roundEnd.currentRound,
    status: roundEnd.status,
    trickLeader: roundEnd.trickLeader,
    remainingDeck: roundEnd.remainingDeck,
    roundScores: roundEnd.roundScores,
  };
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

  const legal = legalPlays(player.hand, state.currentTrick);
  if (!legal.some((card) => cardsEqual(card, command.card))) {
    return rejected(state, command.roomCode, "MustFollowSuit");
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
      const roundEnd = withRoundScoring(
        state.currentRound ?? 0,
        state.scoringMode,
        {
          alliances: state.alliances,
          cardBonuses: state.cardBonuses,
          pirateBets: state.pirateBets,
          roundScores: state.roundScores,
        },
        command.roomCode,
        players,
        {
          trickLeader: resolution.nextLeaderName,
          remainingDeck: state.remainingDeck,
        },
        events,
      );
      return {
        state: {
          ...state,
          ...applyRoundEnd(roundEnd),
          currentTrick: [],
          pendingPirateAbility: null,
          pendingReveal: null,
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
        : [
            {
              round: state.currentRound ?? 0,
              playerName: winnerName,
              points: bonusPoints,
            },
          ];

    const roundEnd = withRoundScoring(
      state.currentRound ?? 0,
      state.scoringMode,
      {
        alliances: [...state.alliances, ...newAlliances],
        cardBonuses: [...state.cardBonuses, ...newCardBonuses],
        pirateBets: state.pirateBets,
        roundScores: state.roundScores,
      },
      command.roomCode,
      playersAfterTrick,
      { trickLeader: winnerName, remainingDeck: state.remainingDeck },
      events,
    );

    return {
      state: {
        ...state,
        ...applyRoundEnd(roundEnd),
        currentTrick: [],
        alliances: [...state.alliances, ...newAlliances],
        cardBonuses: [...state.cardBonuses, ...newCardBonuses],
        pendingPirateAbility,
        pendingReveal: null,
      },
      events,
    };
  }

  return {
    state: { ...state, players, currentTrick: trick, pendingReveal: null },
    events,
  };
}
