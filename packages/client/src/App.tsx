import { useEffect, useState } from "react";
import type { RoomState, ScoringMode } from "@skull-king/shared";
import type { SocketClient } from "./socketClient.js";
import { HomeScreen } from "./HomeScreen.js";
import { LobbyScreen } from "./LobbyScreen.js";
import { REJECTION_MESSAGES } from "./rejectionMessages.js";
import { selectLobbyView } from "./viewModel/lobbyViewModel.js";

export interface AppProps {
  socketClient: SocketClient;
}

export function App({ socketClient }: AppProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [localPlayerName, setLocalPlayerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => socketClient.onRoomState(setRoomState), [socketClient]);

  async function handleCreateRoom(hostName: string) {
    setError(null);
    const response = await socketClient.createRoom(hostName);
    if (response.ok) {
      setLocalPlayerName(
        response.state.players.find((player) => player.isHost)?.name ??
          hostName,
      );
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  async function handleJoinRoom(roomCode: string, displayName: string) {
    setError(null);
    const response = await socketClient.joinRoom(roomCode, displayName);
    if (response.ok) {
      setLocalPlayerName(displayName.trim());
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  async function handleStartGame(scoringMode: ScoringMode) {
    if (!roomState) return;
    setError(null);
    const response = await socketClient.startGame(
      roomState.roomCode,
      scoringMode,
    );
    if (response.ok) {
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  if (roomState && localPlayerName) {
    return (
      <LobbyScreen
        view={selectLobbyView(roomState, localPlayerName)}
        error={error}
        onStartGame={handleStartGame}
      />
    );
  }

  return (
    <HomeScreen
      error={error}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  );
}
