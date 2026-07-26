import type { Player } from "@skull-king/shared";

export interface PausedOverlayProps {
  disconnectedPlayers: Player[];
}

export function PausedOverlay({ disconnectedPlayers }: PausedOverlayProps) {
  return (
    <section role="status" className="paused-overlay">
      <h2>Game Paused</h2>
      <p>Waiting for the following Player(s) to reconnect:</p>
      <ul>
        {disconnectedPlayers.map((player) => (
          <li key={player.name}>{player.name}</li>
        ))}
      </ul>
    </section>
  );
}
