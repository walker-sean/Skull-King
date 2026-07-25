import type { RoomState, RoomStatus } from "@skull-king/shared";

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
  };
}
