export interface ScoreboardToggleProps {
  showingScoreboard: boolean;
  onToggle: () => void;
}

export function ScoreboardToggle({
  showingScoreboard,
  onToggle,
}: ScoreboardToggleProps) {
  return (
    <button className="scoreboard-toggle" onClick={onToggle}>
      {showingScoreboard ? "Back to Game" : "Scoreboard"}
    </button>
  );
}
