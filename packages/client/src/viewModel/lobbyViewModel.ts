import {
  MAX_PLAYERS_TO_START,
  MIN_PLAYERS_TO_START,
  type RoomState,
  type RoomStatus,
  type ScoringMode,
} from "@skull-king/shared";

export type StartGameBlockedReason = "TooFewPlayers" | "TooManyPlayers" | null;

export interface LobbyPlayerView {
  name: string;
  isHost: boolean;
  connected: boolean;
  isSelf: boolean;
}

export interface LobbyViewModel {
  roomCode: string;
  status: RoomStatus;
  players: LobbyPlayerView[];
  isSelfHost: boolean;
  scoringMode: ScoringMode | null;
  startGameBlockedReason: StartGameBlockedReason;
}

function startGameBlockedReason(playerCount: number): StartGameBlockedReason {
  if (playerCount < MIN_PLAYERS_TO_START) return "TooFewPlayers";
  if (playerCount > MAX_PLAYERS_TO_START) return "TooManyPlayers";
  return null;
}

/** Derives what the Lobby screen renders from synced Room state plus the local Player's identity. */
export function selectLobbyView(state: RoomState, localPlayerName: string): LobbyViewModel {
  const players = state.players.map((player) => ({
    ...player,
    isSelf: player.name === localPlayerName,
  }));

  return {
    roomCode: state.roomCode,
    status: state.status,
    players,
    isSelfHost: players.some((player) => player.isSelf && player.isHost),
    scoringMode: state.scoringMode,
    startGameBlockedReason: startGameBlockedReason(state.players.length),
  };
}
