import type { EngineResult, JoinRoomCommand, RoomState } from "@skull-king/shared";
import { normalizeName } from "./normalizeName.js";

export function joinRoom(state: RoomState | null, command: JoinRoomCommand): EngineResult {
  if (state === null) {
    return {
      state: null,
      events: [{ type: "JoinRejected", roomCode: command.roomCode, reason: "RoomNotFound" }],
    };
  }

  const displayName = normalizeName(command.displayName);

  if (displayName === null) {
    return {
      state,
      events: [{ type: "JoinRejected", roomCode: command.roomCode, reason: "InvalidName" }],
    };
  }

  if (state.status !== "Lobby") {
    return {
      state,
      events: [{ type: "JoinRejected", roomCode: command.roomCode, reason: "RoomNotInLobby" }],
    };
  }

  const nameTaken = state.players.some(
    (player) => player.name.toLowerCase() === displayName.toLowerCase(),
  );
  if (nameTaken) {
    return {
      state,
      events: [{ type: "JoinRejected", roomCode: command.roomCode, reason: "NameTaken" }],
    };
  }

  return {
    state: {
      ...state,
      players: [...state.players, { name: displayName, isHost: false, connected: true, hand: [] }],
    },
    events: [{ type: "PlayerJoined", roomCode: command.roomCode, playerName: displayName }],
  };
}
