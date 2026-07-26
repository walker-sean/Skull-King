import type { CreateRoomCommand, EngineResult } from "@skull-king/shared";
import { normalizeName } from "./normalizeName.js";

export function createRoom(command: CreateRoomCommand): EngineResult {
  const hostName = normalizeName(command.hostName);

  if (hostName === null) {
    return {
      state: null,
      events: [{ type: "RoomCreateRejected", reason: "InvalidName" }],
    };
  }

  return {
    state: {
      roomCode: command.roomCode,
      status: "Lobby",
      players: [
        {
          name: hostName,
          isHost: true,
          connected: true,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
      scoringMode: null,
      currentRound: null,
      currentTrick: null,
      trickLeader: null,
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
    },
    events: [{ type: "RoomCreated", roomCode: command.roomCode, hostName }],
  };
}
