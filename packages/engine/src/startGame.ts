import {
  MAX_PLAYERS_TO_START,
  MIN_PLAYERS_TO_START,
  type EngineResult,
  type RoomState,
  type StartGameCommand,
  type StartGameRejectedReason,
} from "@skull-king/shared";
import { dealRound } from "./dealing.js";

const FIRST_ROUND = 1;

function rejected(
  state: RoomState | null,
  roomCode: string,
  reason: StartGameRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "StartGameRejected", roomCode, reason }],
  };
}

export function startGame(
  state: RoomState | null,
  command: StartGameCommand,
): EngineResult {
  if (state === null) {
    return rejected(null, command.roomCode, "RoomNotFound");
  }

  const host = state.players.find((player) => player.isHost);
  if (host === undefined || host.name !== command.actorName) {
    return rejected(state, command.roomCode, "NotHost");
  }

  if (state.status !== "Lobby") {
    return rejected(state, command.roomCode, "RoomNotInLobby");
  }

  if (state.players.length < MIN_PLAYERS_TO_START) {
    return rejected(state, command.roomCode, "TooFewPlayers");
  }

  if (state.players.length > MAX_PLAYERS_TO_START) {
    return rejected(state, command.roomCode, "TooManyPlayers");
  }

  const hands = dealRound(
    state.players.map((player) => player.name),
    FIRST_ROUND,
  );
  const players = state.players.map((player) => ({
    ...player,
    hand: hands.get(player.name) ?? [],
  }));

  return {
    state: {
      ...state,
      status: "Active",
      scoringMode: command.scoringMode,
      currentRound: FIRST_ROUND,
      currentTrick: [],
      trickLeader: state.players[0]?.name ?? null,
      players,
    },
    events: [
      {
        type: "GameStarted",
        roomCode: command.roomCode,
        scoringMode: command.scoringMode,
      },
    ],
  };
}
