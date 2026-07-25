import {
  MAX_PLAYERS_TO_START,
  MIN_PLAYERS_TO_START,
  type EngineResult,
  type RoomState,
  type StartGameCommand,
} from "@skull-king/shared";

export function startGame(state: RoomState | null, command: StartGameCommand): EngineResult {
  if (state === null) {
    return {
      state: null,
      events: [{ type: "StartGameRejected", roomCode: command.roomCode, reason: "RoomNotFound" }],
    };
  }

  if (state.status !== "Lobby") {
    return {
      state,
      events: [{ type: "StartGameRejected", roomCode: command.roomCode, reason: "RoomNotInLobby" }],
    };
  }

  if (state.players.length < MIN_PLAYERS_TO_START) {
    return {
      state,
      events: [{ type: "StartGameRejected", roomCode: command.roomCode, reason: "TooFewPlayers" }],
    };
  }

  if (state.players.length > MAX_PLAYERS_TO_START) {
    return {
      state,
      events: [{ type: "StartGameRejected", roomCode: command.roomCode, reason: "TooManyPlayers" }],
    };
  }

  return {
    state: { ...state, status: "Active", scoringMode: command.scoringMode },
    events: [
      { type: "GameStarted", roomCode: command.roomCode, scoringMode: command.scoringMode },
    ],
  };
}
