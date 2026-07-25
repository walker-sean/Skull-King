import { useState } from "react";
import type { ScoringMode } from "@skull-king/shared";
import { REJECTION_MESSAGES } from "./rejectionMessages.js";
import type { LobbyViewModel } from "./viewModel/lobbyViewModel.js";

export interface LobbyScreenProps {
  view: LobbyViewModel;
  error: string | null;
  onStartGame: (scoringMode: ScoringMode) => void;
}

export function LobbyScreen({ view, error, onStartGame }: LobbyScreenProps) {
  const [scoringMode, setScoringMode] = useState<ScoringMode>("Traditional");

  return (
    <div>
      <h1>
        Room <span>{view.roomCode}</span>
      </h1>
      <p>{view.status}</p>
      {view.scoringMode && <p>Scoring Mode: {view.scoringMode}</p>}
      <ul>
        {view.players.map((player) => (
          <li key={player.name}>
            <span>{player.name}</span>
            {player.isHost && <span> (Host)</span>}
            {player.isSelf && <span> (You)</span>}
            {!player.connected && <span> (disconnected)</span>}
          </li>
        ))}
      </ul>

      {view.isSelfHost && view.status === "Lobby" && (
        <section>
          <h2>Start Game</h2>
          <label htmlFor="scoring-mode">Scoring Mode</label>
          <select
            id="scoring-mode"
            value={scoringMode}
            onChange={(event) =>
              setScoringMode(event.target.value as ScoringMode)
            }
          >
            <option value="Traditional">Traditional</option>
            <option value="Rascal">Rascal</option>
          </select>
          <button
            type="button"
            disabled={view.startGameBlockedReason !== null}
            onClick={() => onStartGame(scoringMode)}
          >
            Start Game
          </button>
          {view.startGameBlockedReason && (
            <p role="alert">
              {REJECTION_MESSAGES[view.startGameBlockedReason]}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
