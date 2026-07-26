import { useEffect, useRef, useState } from "react";
import type {
  Alliance,
  Card,
  PirateAbilityEffect,
  RoomState,
  ScoringMode,
} from "@skull-king/shared";
import { areAllBidsSubmitted } from "@skull-king/engine";
import type { SocketClient } from "./socketClient.js";
import { BiddingScreen } from "./BiddingScreen.js";
import { HomeScreen } from "./HomeScreen.js";
import { LobbyScreen } from "./LobbyScreen.js";
import { TrickPlayScreen } from "./TrickPlayScreen.js";
import { REJECTION_MESSAGES } from "./rejectionMessages.js";
import {
  deriveNewAlliance,
  isAllianceVisibleTo,
} from "./viewModel/allianceViewModel.js";
import { selectBiddingView } from "./viewModel/biddingViewModel.js";
import { selectLobbyView } from "./viewModel/lobbyViewModel.js";
import {
  deriveDrawnCards,
  selectPeekedCards,
  selectPirateAbilityView,
} from "./viewModel/pirateAbilityViewModel.js";
import {
  deriveTrickOutcome,
  selectTrickPlayView,
  type TrickOutcome,
} from "./viewModel/trickPlayViewModel.js";

export interface AppProps {
  socketClient: SocketClient;
}

export function App({ socketClient }: AppProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [localPlayerName, setLocalPlayerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trickOutcome, setTrickOutcome] = useState<TrickOutcome | null>(null);
  const [newAlliance, setNewAlliance] = useState<Alliance | null>(null);
  const [drawnCards, setDrawnCards] = useState<Card[] | null>(null);
  const roomStateRef = useRef<RoomState | null>(null);

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  useEffect(
    () =>
      socketClient.onRoomState((next) => {
        setTrickOutcome(deriveTrickOutcome(roomStateRef.current, next));
        setNewAlliance(deriveNewAlliance(roomStateRef.current, next));
        if (localPlayerName) {
          setDrawnCards(
            deriveDrawnCards(roomStateRef.current, next, localPlayerName),
          );
        }
        setRoomState(next);
      }),
    [socketClient, localPlayerName],
  );

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

  async function handleSubmitBid(bid: number) {
    if (!roomState) return;
    setError(null);
    const response = await socketClient.submitBid(roomState.roomCode, bid);
    if (response.ok) {
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  async function handlePlayCard(card: Card) {
    if (!roomState) return;
    setError(null);
    const response = await socketClient.playCard(roomState.roomCode, card);
    if (response.ok) {
      setTrickOutcome(deriveTrickOutcome(roomState, response.state));
      setNewAlliance(deriveNewAlliance(roomState, response.state));
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  async function handleInvokePirateAbility(effect: PirateAbilityEffect) {
    if (!roomState || !localPlayerName) return;
    setError(null);
    const response = await socketClient.invokePirateAbility(
      roomState.roomCode,
      effect,
    );
    if (response.ok) {
      setDrawnCards(deriveDrawnCards(roomState, response.state, localPlayerName));
      setRoomState(response.state);
    } else {
      setError(REJECTION_MESSAGES[response.event.reason]);
    }
  }

  if (roomState && localPlayerName && roomState.status === "Active") {
    if (areAllBidsSubmitted(roomState)) {
      return (
        <TrickPlayScreen
          view={selectTrickPlayView(roomState, localPlayerName, trickOutcome)}
          error={error}
          onPlayCard={handlePlayCard}
          pirateAbility={selectPirateAbilityView(roomState, localPlayerName)}
          onInvokePirateAbility={handleInvokePirateAbility}
          peekedCards={selectPeekedCards(roomState, localPlayerName)}
          drawnCards={drawnCards}
          allianceBanner={
            newAlliance && isAllianceVisibleTo(newAlliance, localPlayerName)
              ? newAlliance
              : null
          }
        />
      );
    }
    return (
      <BiddingScreen
        view={selectBiddingView(roomState, localPlayerName)}
        error={error}
        onSubmitBid={handleSubmitBid}
      />
    );
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
