import { describe, expect, it } from "vitest";
import type { RoomState } from "@skull-king/shared";
import { selectLobbyView } from "./lobbyViewModel.js";

const roomState: RoomState = {
  roomCode: "ABCD",
  status: "Lobby",
  players: [
    { name: "Alice", isHost: true, connected: true },
    { name: "Bob", isHost: false, connected: true },
  ],
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
      { name: "Alice", isHost: true, connected: true, isSelf: false },
      { name: "Bob", isHost: false, connected: true, isSelf: true },
    ]);
  });

  it("reports whether the local Player is the Host", () => {
    expect(selectLobbyView(roomState, "Alice").isSelfHost).toBe(true);
    expect(selectLobbyView(roomState, "Bob").isSelfHost).toBe(false);
  });
});
