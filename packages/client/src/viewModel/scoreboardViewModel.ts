import type { RascalRoundScore, RoomState, RoundScore, ScoringMode } from "@skull-king/shared";

export interface ScoreboardRoundView {
  round: number;
  scores: RoundScore[] | RascalRoundScore[];
}

export interface ScoreboardStanding {
  playerName: string;
  totalScore: number;
}

export interface ScoreboardViewModel {
  scoringMode: ScoringMode | null;
  rounds: ScoreboardRoundView[];
  standings: ScoreboardStanding[];
  isCompleted: boolean;
  winnerNames: string[];
}

/**
 * roundScores is a flat array (one entry per Player, per scored Round, in Round order — see
 * ADR-0010), with no Round number of its own. Since the Player roster is fixed for a Game's
 * lifetime, each Round's slice is exactly one Player-count wide.
 */
function groupByRound(
  roundScores: RoomState["roundScores"],
  playerCount: number,
): ScoreboardRoundView[] {
  if (playerCount === 0) return [];

  const rounds: ScoreboardRoundView[] = [];
  for (let start = 0; start < roundScores.length; start += playerCount) {
    rounds.push({
      round: rounds.length + 1,
      scores: roundScores.slice(start, start + playerCount) as
        | RoundScore[]
        | RascalRoundScore[],
    });
  }
  return rounds;
}

function currentTotalFor(
  playerName: string,
  rounds: ScoreboardRoundView[],
): number {
  for (let i = rounds.length - 1; i >= 0; i--) {
    const entry = rounds[i]!.scores.find(
      (score) => score.playerName === playerName,
    );
    if (entry) return entry.totalScore;
  }
  return 0;
}

function winnersOf(standings: ScoreboardStanding[]): string[] {
  if (standings.length === 0) return [];
  const topScore = standings[0]!.totalScore;
  return standings
    .filter((standing) => standing.totalScore === topScore)
    .map((standing) => standing.playerName);
}

/** Derives what the Scoreboard screen renders from synced Room state. */
export function selectScoreboardView(state: RoomState): ScoreboardViewModel {
  const rounds = groupByRound(state.roundScores, state.players.length);

  const standings = state.players
    .map((player) => ({
      playerName: player.name,
      totalScore: currentTotalFor(player.name, rounds),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const isCompleted = state.status === "Completed";

  return {
    scoringMode: state.scoringMode,
    rounds,
    standings,
    isCompleted,
    winnerNames: isCompleted ? winnersOf(standings) : [],
  };
}
