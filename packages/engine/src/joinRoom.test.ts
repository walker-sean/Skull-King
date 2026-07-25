import { describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { joinRoom } from "./joinRoom.js";

function lobbyWithHost(): RoomState {
  return {
    roomCode: "ABCD",
    status: "Lobby",
    players: [{ name: "Alice", isHost: true, connected: true, hand: [], bid: null }],
    scoringMode: null,
    currentRound: null,
  };
}

describe("joinRoom", () => {
  it("adds the joining player to the roster as a non-host, connected Player", () => {
    const result = joinRoom(lobbyWithHost(), { type: "JoinRoom", roomCode: "ABCD", displayName: "Bob" });

    expect(result.state?.players).toEqual([
      { name: "Alice", isHost: true, connected: true, hand: [], bid: null },
      { name: "Bob", isHost: false, connected: true, hand: [], bid: null },
    ]);
    expect(result.events).toEqual([{ type: "PlayerJoined", roomCode: "ABCD", playerName: "Bob" }]);
  });

  it("trims whitespace from the display name", () => {
    const result = joinRoom(lobbyWithHost(), { type: "JoinRoom", roomCode: "ABCD", displayName: "  Bob  " });

    expect(result.state?.players[1]?.name).toBe("Bob");
  });

  it("rejects joining a Room Code with no matching Room", () => {
    const result = joinRoom(null, { type: "JoinRoom", roomCode: "ZZZZ", displayName: "Bob" });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([{ type: "JoinRejected", roomCode: "ZZZZ", reason: "RoomNotFound" }]);
  });

  it("rejects a blank display name, leaving the Room state unchanged", () => {
    const room = lobbyWithHost();
    const result = joinRoom(room, { type: "JoinRoom", roomCode: "ABCD", displayName: "   " });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([{ type: "JoinRejected", roomCode: "ABCD", reason: "InvalidName" }]);
  });

  it("rejects a display name already taken in the Room, case-insensitively", () => {
    const room = lobbyWithHost();
    const result = joinRoom(room, { type: "JoinRoom", roomCode: "ABCD", displayName: "alice" });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([{ type: "JoinRejected", roomCode: "ABCD", reason: "NameTaken" }]);
  });

  it("rejects joining a Room that is no longer in Lobby status", () => {
    const room: RoomState = { ...lobbyWithHost(), status: "Active" };
    const result = joinRoom(room, { type: "JoinRoom", roomCode: "ABCD", displayName: "Bob" });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([{ type: "JoinRejected", roomCode: "ABCD", reason: "RoomNotInLobby" }]);
  });
});
