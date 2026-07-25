import type { LobbyViewModel } from "./viewModel/lobbyViewModel.js";

export interface LobbyScreenProps {
  view: LobbyViewModel;
}

export function LobbyScreen({ view }: LobbyScreenProps) {
  return (
    <div>
      <h1>
        Room <span>{view.roomCode}</span>
      </h1>
      <p>{view.status}</p>
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
    </div>
  );
}
