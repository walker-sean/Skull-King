import { describe, expect, it } from "vitest";
import { createRoom } from "./createRoom.js";

describe("createRoom", () => {
  it("creates a Room in Lobby status with the host as the only, connected player", () => {
    const result = createRoom({ type: "CreateRoom", roomCode: "ABCD", hostName: "Alice" });

    expect(result.state).toEqual({
      roomCode: "ABCD",
      status: "Lobby",
      players: [{ name: "Alice", isHost: true, connected: true }],
      scoringMode: null,
    });
    expect(result.events).toEqual([{ type: "RoomCreated", roomCode: "ABCD", hostName: "Alice" }]);
  });

  it("trims whitespace from the host name", () => {
    const result = createRoom({ type: "CreateRoom", roomCode: "ABCD", hostName: "  Alice  " });

    expect(result.state?.players[0]?.name).toBe("Alice");
  });

  it("rejects a blank host name without creating a Room", () => {
    const result = createRoom({ type: "CreateRoom", roomCode: "ABCD", hostName: "   " });

    expect(result.state).toBeNull();
    expect(result.events).toEqual([{ type: "RoomCreateRejected", reason: "InvalidName" }]);
  });
});
