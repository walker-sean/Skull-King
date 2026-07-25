// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { RoomState } from "@skull-king/shared";
import { App } from "./App.js";
import type { SocketClient } from "./socketClient.js";

afterEach(() => cleanup());

function createMockSocketClient(overrides: Partial<SocketClient> = {}): SocketClient {
  let roomStateHandler: ((state: RoomState) => void) | null = null;

  return {
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    onRoomState: vi.fn((handler) => {
      roomStateHandler = handler;
      return () => {
        roomStateHandler = null;
      };
    }),
    disconnect: vi.fn(),
    // Test-only escape hatch to simulate a broadcast arriving from the server.
    ...({ emitRoomState: (state: RoomState) => roomStateHandler?.(state) } as object),
    ...overrides,
  } as SocketClient;
}

const lobbyState: RoomState = {
  roomCode: "ABCD",
  status: "Lobby",
  players: [{ name: "Alice", isHost: true, connected: true }],
};

describe("App", () => {
  it("shows Create Room and Join Room sections on first render", () => {
    render(<App socketClient={createMockSocketClient()} />);

    expect(screen.getByRole("heading", { name: /create a room/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /join a room/i })).toBeInTheDocument();
  });

  it("creates a Room and shows the Lobby roster on success", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: lobbyState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    expect(await screen.findByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(socketClient.createRoom).toHaveBeenCalledWith("Alice");
  });

  it("joins a Room and shows the Lobby roster on success", async () => {
    const joinedState: RoomState = {
      ...lobbyState,
      players: [...lobbyState.players, { name: "Bob", isHost: false, connected: true }],
    };
    const socketClient = createMockSocketClient({
      joinRoom: vi.fn().mockResolvedValue({ ok: true, state: joinedState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: "ABCD" } });
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(socketClient.joinRoom).toHaveBeenCalledWith("ABCD", "Bob");
  });

  it("shows an error and stays on the Home screen when joining is rejected", async () => {
    const socketClient = createMockSocketClient({
      joinRoom: vi.fn().mockResolvedValue({
        ok: false,
        event: { type: "JoinRejected", roomCode: "ABCD", reason: "NameTaken" },
      }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: "ABCD" } });
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(await screen.findByText(/that name is already taken/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /join a room/i })).toBeInTheDocument();
  });

  it("live-updates the Lobby roster when the server broadcasts a new Room state", async () => {
    const socketClient = createMockSocketClient({
      createRoom: vi.fn().mockResolvedValue({ ok: true, state: lobbyState }),
    });
    render(<App socketClient={socketClient} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await screen.findByText("ABCD");

    const updated: RoomState = {
      ...lobbyState,
      players: [...lobbyState.players, { name: "Bob", isHost: false, connected: true }],
    };
    (socketClient as unknown as { emitRoomState: (s: RoomState) => void }).emitRoomState(updated);

    expect(await screen.findByText("Bob")).toBeInTheDocument();
  });
});
