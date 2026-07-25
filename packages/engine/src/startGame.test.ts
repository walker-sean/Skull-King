import { describe, expect, it } from "vitest";
import type { Player, RoomState } from "@skull-king/shared";
import { startGame } from "./startGame.js";

function playersNamed(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player${index + 1}`,
    isHost: index === 0,
    connected: true,
  }));
}

function lobbyWith(count: number): RoomState {
  return {
    roomCode: "ABCD",
    status: "Lobby",
    players: playersNamed(count),
    scoringMode: null,
  };
}

describe("startGame", () => {
  it("starts the Game, locking in the Scoring Mode and moving the Room to Active", () => {
    const room = lobbyWith(3);
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Traditional",
      actorName: "Player1",
    });

    expect(result.state).toEqual({ ...room, status: "Active", scoringMode: "Traditional" });
    expect(result.events).toEqual([
      { type: "GameStarted", roomCode: "ABCD", scoringMode: "Traditional" },
    ]);
  });

  it("rejects starting with fewer than 3 Players, leaving the Room state unchanged", () => {
    const room = lobbyWith(2);
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Traditional",
      actorName: "Player1",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ABCD", reason: "TooFewPlayers" },
    ]);
  });

  it("rejects starting with more than 8 Players, leaving the Room state unchanged", () => {
    const room = lobbyWith(9);
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Rascal",
      actorName: "Player1",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ABCD", reason: "TooManyPlayers" },
    ]);
  });

  it("accepts the boundary Player counts of 3 and 8", () => {
    expect(
      startGame(lobbyWith(3), {
        type: "StartGame",
        roomCode: "ABCD",
        scoringMode: "Traditional",
        actorName: "Player1",
      }).state?.status,
    ).toBe("Active");
    expect(
      startGame(lobbyWith(8), {
        type: "StartGame",
        roomCode: "ABCD",
        scoringMode: "Traditional",
        actorName: "Player1",
      }).state?.status,
    ).toBe("Active");
  });

  it("rejects starting a Room that has already started, leaving the Room state unchanged", () => {
    const room: RoomState = { ...lobbyWith(3), status: "Active", scoringMode: "Traditional" };
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Rascal",
      actorName: "Player1",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ABCD", reason: "RoomNotInLobby" },
    ]);
  });

  it("rejects starting a Room Code with no matching Room", () => {
    const result = startGame(null, {
      type: "StartGame",
      roomCode: "ZZZZ",
      scoringMode: "Traditional",
      actorName: "Player1",
    });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ZZZZ", reason: "RoomNotFound" },
    ]);
  });

  it("rejects starting the Game when the actor is not the Host, leaving the Room state unchanged", () => {
    const room = lobbyWith(3);
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Traditional",
      actorName: "Player2",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ABCD", reason: "NotHost" },
    ]);
  });

  it("rejects starting the Game when there is no actor identity, leaving the Room state unchanged", () => {
    const room = lobbyWith(3);
    const result = startGame(room, {
      type: "StartGame",
      roomCode: "ABCD",
      scoringMode: "Traditional",
      actorName: null,
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "StartGameRejected", roomCode: "ABCD", reason: "NotHost" },
    ]);
  });
});
