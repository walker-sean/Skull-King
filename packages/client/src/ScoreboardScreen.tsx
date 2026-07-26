import type { ScoreboardViewModel } from "./viewModel/scoreboardViewModel.js";

export interface ScoreboardScreenProps {
  view: ScoreboardViewModel;
}

export function ScoreboardScreen({ view }: ScoreboardScreenProps) {
  return (
    <div className="screen">
      <h1>Scoreboard</h1>

      {view.rounds.map((round) => (
        <section key={round.round}>
          <h2>Round {round.round}</h2>
          <ul>
            {round.scores.map((score) => (
              <li key={score.playerName}>
                {score.playerName}
                {": "}
                {score.scoringMode === "Rascal" ? (
                  <>
                    {score.outcome}, Bid {score.bidPoints}, Bonus{" "}
                    {score.bonusPoints}, Alliance {score.allianceBonus}, Bet{" "}
                    {score.betResult},{" "}
                  </>
                ) : (
                  <>
                    Bid {score.bidPoints}, Alliance {score.allianceBonus},{" "}
                  </>
                )}
                Round total {score.roundPoints}, Running total{" "}
                {score.totalScore}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2>{view.isCompleted ? "Final standings" : "Standings"}</h2>
      <ul aria-label="Standings">
        {view.standings.map((standing) => (
          <li key={standing.playerName}>
            {standing.playerName}
            {": "}
            {standing.totalScore}
            {view.winnerNames.includes(standing.playerName) && " (Winner!)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
