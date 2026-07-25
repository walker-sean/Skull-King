import type {
  EngineResult,
  JoinRoomCommand,
  JoinRejectedReason,
  RoomState,
} from "@skull-king/shared";
import { normalizeName } from "./normalizeName.js";

function rejected(
  state: RoomState,
  roomCode: string,
  reason: JoinRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "JoinRejected", roomCode, reason }],
  };
}

/**
 * Handles both a brand-new Player joining a Lobby and an existing, disconnected Player
 * resuming their seat in an Active or Paused Room by rejoining with the same Room Code
 * and display name (see docs/adr/0002-no-accounts-reconnect-by-name.md) — there's no
 * separate "Reconnect" command; the Room glossary treats joining and rejoining as the
 * same action.
 */
export function joinRoom(
  state: RoomState | null,
  command: JoinRoomCommand,
): EngineResult {
  if (state === null) {
    return {
      state: null,
      events: [
        {
          type: "JoinRejected",
          roomCode: command.roomCode,
          reason: "RoomNotFound",
        },
      ],
    };
  }

  const displayName = normalizeName(command.displayName);

  if (displayName === null) {
    return rejected(state, command.roomCode, "InvalidName");
  }

  const existingPlayer = state.players.find(
    (player) => player.name.toLowerCase() === displayName.toLowerCase(),
  );

  if (state.status === "Lobby") {
    if (existingPlayer !== undefined) {
      return rejected(state, command.roomCode, "NameTaken");
    }

    return {
      state: {
        ...state,
        players: [
          ...state.players,
          {
            name: displayName,
            isHost: false,
            connected: true,
            hand: [],
            bid: null,
          },
        ],
      },
      events: [
        {
          type: "PlayerJoined",
          roomCode: command.roomCode,
          playerName: displayName,
        },
      ],
    };
  }

  if (state.status === "Completed" || existingPlayer === undefined) {
    return rejected(state, command.roomCode, "RoomNotInLobby");
  }

  if (existingPlayer.connected) {
    return rejected(state, command.roomCode, "AlreadyConnected");
  }

  const players = state.players.map((player) =>
    player.name === existingPlayer.name
      ? { ...player, connected: true }
      : player,
  );
  const roomResumes =
    state.status === "Paused" && players.every((player) => player.connected);

  return {
    state: { ...state, players, status: roomResumes ? "Active" : state.status },
    events: [
      {
        type: "PlayerReconnected",
        roomCode: command.roomCode,
        playerName: existingPlayer.name,
      },
      ...(roomResumes
        ? [{ type: "RoomResumed", roomCode: command.roomCode } as const]
        : []),
    ],
  };
}
