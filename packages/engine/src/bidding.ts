import type {
  EngineResult,
  RoomState,
  SubmitBidCommand,
  SubmitBidRejectedReason,
} from "@skull-king/shared";

function rejected(
  state: RoomState | null,
  roomCode: string,
  reason: SubmitBidRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "SubmitBidRejected", roomCode, reason }],
  };
}

export function submitBid(
  state: RoomState | null,
  command: SubmitBidCommand,
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

  if (player.bid !== null) {
    return rejected(state, command.roomCode, "AlreadyBid");
  }

  if (
    !Number.isInteger(command.bid) ||
    command.bid < 0 ||
    command.bid > player.hand.length
  ) {
    return rejected(state, command.roomCode, "InvalidBid");
  }

  const players = state.players.map((candidate) =>
    candidate.name === player.name
      ? { ...candidate, bid: command.bid }
      : candidate,
  );

  return {
    state: { ...state, players },
    events: [
      {
        type: "BidSubmitted",
        roomCode: command.roomCode,
        playerName: player.name,
      },
    ],
  };
}

/**
 * Whether every Player has submitted a Bid for the current Round. The moment this flips
 * true is the reveal: Bids stay hidden from other Players until then (see CONTEXT.md's
 * Bid glossary entry), so callers use this to decide when to stop redacting other Players'
 * Bids rather than trusting any UI-level timing.
 */
export function areAllBidsSubmitted(state: RoomState): boolean {
  return (
    state.players.length > 0 &&
    state.players.every((player) => player.bid !== null)
  );
}
