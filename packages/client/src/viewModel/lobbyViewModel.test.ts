import { describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { selectLobbyView } from "./lobbyViewModel.js";

const roomState: RoomState = {
  roomCode: "ABCD",
  status: "Lobby",
  players: [
    { name: "Alice", isHost: true, connected: true, hand: [], bid: null },
    { name: "Bob", isHost: false, connected: true, hand: [], bid: null },
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

describe("selectLobbyView", () => {
  it("passes through the Room Code and Room Status unchanged", () => {
    const view = selectLobbyView(roomState, "Bob");

    expect(view.roomCode).toBe("ABCD");
    expect(view.status).toBe("Lobby");
  });

  it("flags which roster entry is the local Player", () => {
    const view = selectLobbyView(roomState, "Bob");

    expect(view.players).toEqual([
      {
        name: "Alice",
        isHost: true,
        connected: true,
        hand: [],
        bid: null,
        isSelf: false,
      },
      {
        name: "Bob",
        isHost: false,
        connected: true,
        hand: [],
        bid: null,
        isSelf: true,
      },
    ]);
  });

  it("reports whether the local Player is the Host", () => {
    expect(selectLobbyView(roomState, "Alice").isSelfHost).toBe(true);
    expect(selectLobbyView(roomState, "Bob").isSelfHost).toBe(false);
  });

  it("passes through the Scoring Mode unchanged", () => {
    expect(selectLobbyView(roomState, "Alice").scoringMode).toBeNull();
    expect(
      selectLobbyView({ ...roomState, scoringMode: "Rascal" }, "Alice")
        .scoringMode,
    ).toBe("Rascal");
  });

  it("blocks starting the Game with fewer than 3 Players", () => {
    expect(selectLobbyView(roomState, "Alice").startGameBlockedReason).toBe(
      "TooFewPlayers",
    );
  });

  it("does not block starting the Game with a Player count between 3 and 8", () => {
    const room: RoomState = {
      ...roomState,
      players: [
        ...roomState.players,
        { name: "Carol", isHost: false, connected: true, hand: [], bid: null },
      ],
    };
    expect(selectLobbyView(room, "Alice").startGameBlockedReason).toBeNull();
  });

  it("blocks starting the Game with more than 8 Players", () => {
    const room: RoomState = {
      ...roomState,
      players: Array.from({ length: 9 }, (_, index) => ({
        name: `Player${index + 1}`,
        isHost: index === 0,
        connected: true,
        hand: [],
        bid: null,
      })),
    };
    expect(selectLobbyView(room, "Alice").startGameBlockedReason).toBe(
      "TooManyPlayers",
    );
  });
});
