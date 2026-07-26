import { describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { disconnectPlayer } from "./disconnectPlayer.js";

function activeRoom(): RoomState {
  return {
    roomCode: "ABCD",
    status: "Active",
    players: [
      { name: "Alice", isHost: true, connected: true, hand: [], bid: 1 },
      {
        name: "Bob",
        isHost: false,
        connected: true,
        hand: [{ kind: "Suited", suit: "Parrot", rank: 5 }],
        bid: null,
      },
    ],
    scoringMode: "Traditional",
    currentRound: 2,
    currentTrick: [
      {
        playerName: "Alice",
        card: { kind: "Suited", suit: "Parrot", rank: 3 },
      },
    ],
    trickLeader: "Alice",
    alliances: [],
    remainingDeck: [],
    pendingPirateAbility: null,
    pirateBets: [],
  };
}

describe("disconnectPlayer", () => {
  it("marks the Player disconnected and pauses an Active Room, leaving the Trick in progress intact", () => {
    const room = activeRoom();
    const result = disconnectPlayer(room, {
      type: "Disconnect",
      roomCode: "ABCD",
      playerName: "Bob",
    });

    expect(result.state).toEqual({
      ...room,
      status: "Paused",
      players: [room.players[0], { ...room.players[1], connected: false }],
    });
    expect(result.events).toEqual([
      { type: "PlayerDisconnected", roomCode: "ABCD", playerName: "Bob" },
      { type: "RoomPaused", roomCode: "ABCD" },
    ]);
  });

  it("does not re-pause a Room that is already Paused when another Player disconnects", () => {
    const room: RoomState = {
      ...activeRoom(),
      status: "Paused",
      players: [
        { name: "Alice", isHost: true, connected: false, hand: [], bid: 1 },
        { name: "Bob", isHost: false, connected: true, hand: [], bid: null },
      ],
    };
    const result = disconnectPlayer(room, {
      type: "Disconnect",
      roomCode: "ABCD",
      playerName: "Bob",
    });

    expect(result.state?.status).toBe("Paused");
    expect(result.events).toEqual([
      { type: "PlayerDisconnected", roomCode: "ABCD", playerName: "Bob" },
    ]);
  });

  it("does not pause a Room still in Lobby when a Player disconnects", () => {
    const room: RoomState = {
      roomCode: "ABCD",
      status: "Lobby",
      players: [
        { name: "Alice", isHost: true, connected: true, hand: [], bid: null },
      ],
      scoringMode: null,
      currentRound: null,
      currentTrick: null,
      trickLeader: null,
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
    };
    const result = disconnectPlayer(room, {
      type: "Disconnect",
      roomCode: "ABCD",
      playerName: "Alice",
    });

    expect(result.state?.status).toBe("Lobby");
    expect(result.events).toEqual([
      { type: "PlayerDisconnected", roomCode: "ABCD", playerName: "Alice" },
    ]);
  });

  it("is a no-op when the Room doesn't exist", () => {
    const result = disconnectPlayer(null, {
      type: "Disconnect",
      roomCode: "ZZZZ",
      playerName: "Alice",
    });

    expect(result).toEqual({ state: null, events: [] });
  });

  it("is a no-op when the named Player isn't on the roster", () => {
    const room = activeRoom();
    const result = disconnectPlayer(room, {
      type: "Disconnect",
      roomCode: "ABCD",
      playerName: "Carol",
    });

    expect(result).toEqual({ state: room, events: [] });
  });

  it("is a no-op when the Player is already disconnected", () => {
    const room: RoomState = {
      ...activeRoom(),
      status: "Paused",
      players: [
        { name: "Alice", isHost: true, connected: true, hand: [], bid: 1 },
        { name: "Bob", isHost: false, connected: false, hand: [], bid: null },
      ],
    };
    const result = disconnectPlayer(room, {
      type: "Disconnect",
      roomCode: "ABCD",
      playerName: "Bob",
    });

    expect(result).toEqual({ state: room, events: [] });
  });
});
