import type { Card, PirateName, RoomState } from "@skull-king/shared";
import { cardsEqual } from "@skull-king/engine";

export interface PirateAbilityViewModel {
  pirateName: PirateName;
  playerName: string;
  isSelf: boolean;
  /** All Player names in seat order — Rosie D'Laney may choose any Player, including herself, to lead. */
  playerNames: string[];
  /** The acting Player's current Bid, for Harry the Giant's adjustment preview. */
  currentBid: number | null;
  /** The acting Player's hand size, bounding Harry's Bid adjustment and Bendt's discard. */
  handSize: number;
  /** The local Player's hand, for Bendt the Bandit's discard picker; empty unless isSelf. */
  hand: Card[];
}

/**
 * Derives what the Advanced Pirate Ability panel renders from synced Room state plus the
 * local Player's identity. Null when no ability is pending. Gated visibility (full form vs.
 * "pending for X" status) is left to the component via `isSelf`, since pendingPirateAbility
 * itself is not redacted server-side (see redactRoomStateFor) — every Player can see who it's
 * pending for, but only that Player may act on it.
 */
export function selectPirateAbilityView(
  state: RoomState,
  localPlayerName: string,
): PirateAbilityViewModel | null {
  const pending = state.pendingPirateAbility;
  if (pending === null) return null;

  const actor = state.players.find(
    (player) => player.name === pending.playerName,
  );
  const isSelf = pending.playerName === localPlayerName;

  return {
    pirateName: pending.pirateName,
    playerName: pending.playerName,
    isSelf,
    playerNames: state.players.map((player) => player.name),
    currentBid: actor?.bid ?? null,
    handSize: actor?.hand.length ?? 0,
    hand: isSelf ? (actor?.hand ?? []) : [],
  };
}

/**
 * The undealt cards Juanita Jade's ability peeked at, visible only to the Player who invoked
 * it (see CONTEXT.md's Advanced Pirate Ability entry); null otherwise, including for every
 * other Player since the server already redacts pendingReveal down to just its owner.
 */
export function selectPeekedCards(
  state: RoomState,
  localPlayerName: string,
): Card[] | null {
  return state.pendingReveal !== null &&
    state.pendingReveal.playerName === localPlayerName
    ? state.pendingReveal.cards
    : null;
}

function handDiff(previousHand: readonly Card[], nextHand: readonly Card[]): Card[] {
  let remaining = [...previousHand];
  const added: Card[] = [];

  for (const card of nextHand) {
    const index = remaining.findIndex((candidate) => cardsEqual(candidate, card));
    if (index === -1) {
      added.push(card);
    } else {
      remaining = [...remaining.slice(0, index), ...remaining.slice(index + 1)];
    }
  }

  return added;
}

/**
 * Bendt the Bandit's replacement cards, inferred from the local Player's own hand diff rather
 * than a dedicated event (see issue #19), by comparing Room state just before and just after
 * their invocation resolves — mirrors deriveTrickOutcome's diff-based narration. Returns null
 * except in that one transition, so it doesn't fire on ordinary dealing or card plays. A card
 * drawn and immediately discarded again wouldn't show up here, but that's the diff the spec
 * calls for.
 */
export function deriveDrawnCards(
  previous: RoomState | null,
  next: RoomState,
  localPlayerName: string,
): Card[] | null {
  if (previous === null) return null;

  const resolvedBendt =
    previous.pendingPirateAbility?.pirateName === "BendtTheBandit" &&
    previous.pendingPirateAbility.playerName === localPlayerName &&
    next.pendingPirateAbility === null;
  if (!resolvedBendt) return null;

  const previousHand =
    previous.players.find((player) => player.name === localPlayerName)?.hand ??
    [];
  const nextHand =
    next.players.find((player) => player.name === localPlayerName)?.hand ?? [];

  const drawn = handDiff(previousHand, nextHand);
  return drawn.length > 0 ? drawn : null;
}
