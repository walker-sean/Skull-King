import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { openRoomStore, type RoomStore } from "./roomStore.js";

const lobbyRoom: RoomState = {
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
    {
      name: "Bob",
      isHost: false,
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
};

describe("RoomStore", () => {
  let dir: string;
  let dbPath: string;
  let store: RoomStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skull-king-test-"));
    dbPath = join(dir, "rooms.sqlite");
    store = openRoomStore(dbPath);
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips a saved Room's full state", () => {
    store.saveRoom(lobbyRoom);

    expect(store.loadRoom("ABCD")).toEqual(lobbyRoom);
  });

  it("returns null for a Room Code that was never saved", () => {
    expect(store.loadRoom("ZZZZ")).toBeNull();
  });

  it("overwrites the previous state on repeated saves for the same Room Code", () => {
    store.saveRoom(lobbyRoom);
    const updated: RoomState = {
      ...lobbyRoom,
      players: [
        ...lobbyRoom.players,
        {
          name: "Cara",
          isHost: false,
          connected: true,
          hand: [],
          bid: null,
          tricksWon: 0,
          score: 0,
        },
      ],
    };
    store.saveRoom(updated);

    expect(store.loadRoom("ABCD")).toEqual(updated);
  });

  it("lists Room Codes that are not Completed", () => {
    store.saveRoom(lobbyRoom);
    store.saveRoom({
      roomCode: "WXYZ",
      status: "Completed",
      players: [],
      scoringMode: "Traditional",
      currentRound: 10,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
    });

    expect(store.listNonCompletedRoomCodes()).toEqual(["ABCD"]);
  });

  it("round-trips a Completed Room's full state", () => {
    const completedRoom: RoomState = {
      roomCode: "WXYZ",
      status: "Completed",
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
      scoringMode: "Rascal",
      currentRound: 10,
      currentTrick: [],
      trickLeader: "Alice",
      alliances: [],
      remainingDeck: [],
      pendingPirateAbility: null,
      pirateBets: [],
      cardBonuses: [],
    };
    store.saveRoom(completedRoom);

    expect(store.loadRoom("WXYZ")).toEqual(completedRoom);
  });

  it("survives a simulated process restart (reopening the same file)", () => {
    store.saveRoom(lobbyRoom);
    store.close();

    const reopened = openRoomStore(dbPath);
    try {
      expect(reopened.loadRoom("ABCD")).toEqual(lobbyRoom);
    } finally {
      reopened.close();
    }
  });
});
