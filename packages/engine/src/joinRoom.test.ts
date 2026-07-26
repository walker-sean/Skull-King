import { describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { joinRoom } from "./joinRoom.js";

function lobbyWithHost(): RoomState {
  return {
    roomCode: "ABCD",
    status: "Lobby",
    players: [
      {
        name: "Alice",
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
    cardBonuses: [],
    roundScores: [],
    pendingReveal: null,
  };
}

describe("joinRoom", () => {
  it("adds the joining player to the roster as a non-host, connected Player", () => {
    const result = joinRoom(lobbyWithHost(), {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Bob",
    });

    expect(result.state?.players).toEqual([
      {
        name: "Alice",
        isHost: true,
        connected: true,
        hand: [],
        bid: null,
        tricksWon: 0,
        score: 0,
      },
      {
        name: "Bob",
        isHost: false,
        connected: true,
        hand: [],
        bid: null,
        tricksWon: 0,
        score: 0,
      },
    ]);
    expect(result.events).toEqual([
      { type: "PlayerJoined", roomCode: "ABCD", playerName: "Bob" },
    ]);
  });

  it("trims whitespace from the display name", () => {
    const result = joinRoom(lobbyWithHost(), {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "  Bob  ",
    });

    expect(result.state?.players[1]?.name).toBe("Bob");
  });

  it("rejects joining a Room Code with no matching Room", () => {
    const result = joinRoom(null, {
      type: "JoinRoom",
      roomCode: "ZZZZ",
      displayName: "Bob",
    });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ZZZZ", reason: "RoomNotFound" },
    ]);
  });

  it("rejects a blank display name, leaving the Room state unchanged", () => {
    const room = lobbyWithHost();
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "   ",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "InvalidName" },
    ]);
  });

  it("rejects a display name already taken in the Room, case-insensitively", () => {
    const room = lobbyWithHost();
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "alice",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "NameTaken" },
    ]);
  });

  it("rejects a brand-new Player joining a Room that is no longer in Lobby status", () => {
    const room: RoomState = { ...lobbyWithHost(), status: "Active" };
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Bob",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "RoomNotInLobby" },
    ]);
  });

  it("rejects joining a Completed Room even if the name matches a disconnected Player", () => {
    const room: RoomState = {
      ...lobbyWithHost(),
      status: "Completed",
      players: [
        {
          name: "Alice",
          isHost: true,
          connected: false,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
    };
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Alice",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "RoomNotInLobby" },
    ]);
  });

  it("resumes a disconnected Player's seat in an Active Room, leaving hand and bid untouched", () => {
    const room: RoomState = {
      roomCode: "ABCD",
      status: "Active",
      players: [
        {
          name: "Alice",
          isHost: true,
          connected: true,
          hand: [],
          bid: 1,
          tricksWon: 0,
          score: 0,
        },
        {
          name: "Bob",
          isHost: false,
          connected: false,
          hand: [{ kind: "Suited", suit: "Parrot", rank: 5 }],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
      scoringMode: "Traditional",
      currentRound: 2,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
      roundScores: [],
      pendingReveal: null,
    };

    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "bob",
    });

    expect(result.state).toEqual({
      ...room,
      players: [
        room.players[0],
        {
          name: "Bob",
          isHost: false,
          connected: true,
          hand: [{ kind: "Suited", suit: "Parrot", rank: 5 }],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
    });
    expect(result.events).toEqual([
      { type: "PlayerReconnected", roomCode: "ABCD", playerName: "Bob" },
    ]);
  });

  it("resumes a Paused Room to Active once every Player has reconnected", () => {
    const room: RoomState = {
      roomCode: "ABCD",
      status: "Paused",
      players: [
        {
          name: "Alice",
          isHost: true,
          connected: true,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
        {
          name: "Bob",
          isHost: false,
          connected: false,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
      scoringMode: "Traditional",
      currentRound: 1,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
      roundScores: [],
      pendingReveal: null,
    };

    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Bob",
    });

    expect(result.state?.status).toBe("Active");
    expect(result.events).toEqual([
      { type: "PlayerReconnected", roomCode: "ABCD", playerName: "Bob" },
      { type: "RoomResumed", roomCode: "ABCD" },
    ]);
  });

  it("keeps a Paused Room paused if other Players are still disconnected", () => {
    const room: RoomState = {
      roomCode: "ABCD",
      status: "Paused",
      players: [
        {
          name: "Alice",
          isHost: true,
          connected: false,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
        {
          name: "Bob",
          isHost: false,
          connected: false,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
      scoringMode: "Traditional",
      currentRound: 1,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
      roundScores: [],
      pendingReveal: null,
    };

    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Bob",
    });

    expect(result.state?.status).toBe("Paused");
    expect(result.events).toEqual([
      { type: "PlayerReconnected", roomCode: "ABCD", playerName: "Bob" },
    ]);
  });

  it("rejects a reconnect attempt for a Player who is already connected", () => {
    const room: RoomState = { ...lobbyWithHost(), status: "Active" };
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Alice",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "AlreadyConnected" },
    ]);
  });

  it("rejects a brand-new name joining a Room that is no longer in Lobby status, even while Paused", () => {
    const room: RoomState = {
      roomCode: "ABCD",
      status: "Paused",
      players: [
        {
          name: "Alice",
          isHost: true,
          connected: false,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
      scoringMode: "Traditional",
      currentRound: 1,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
      roundScores: [],
      pendingReveal: null,
    };
    const result = joinRoom(room, {
      type: "JoinRoom",
      roomCode: "ABCD",
      displayName: "Carol",
    });

    expect(result.state).toEqual(room);
    expect(result.events).toEqual([
      { type: "JoinRejected", roomCode: "ABCD", reason: "RoomNotInLobby" },
    ]);
  });
});
