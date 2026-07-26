import { useState } from "react";
import type { Card } from "@skull-king/shared";
import type {
  HandCardView,
  TrickPlayViewModel,
} from "./viewModel/trickPlayViewModel.js";

type TigressCard = Extract<Card, { kind: "Tigress" }>;

export interface TrickPlayScreenProps {
  view: TrickPlayViewModel;
  error: string | null;
  onPlayCard: (card: Card) => void;
}

function cardLabel(card: Card): string {
  switch (card.kind) {
    case "Suited":
      return `${card.suit} ${card.rank}`;
    case "Pirate":
      return `Pirate: ${card.name}`;
    case "Tigress":
      return card.declaredAs ? `Tigress (${card.declaredAs})` : "Tigress";
    case "SkullKing":
      return "Skull King";
    case "Mermaid":
      return "Mermaid";
    case "Escape":
      return "Escape";
    case "Loot":
      return "Loot";
    case "Kraken":
      return "Kraken";
    case "WhiteWhale":
      return "White Whale";
  }
}

export function TrickPlayScreen({
  view,
  error,
  onPlayCard,
}: TrickPlayScreenProps) {
  const [decliningTigress, setDecliningTigress] = useState<TigressCard | null>(
    null,
  );

  function handleCardClick(entry: HandCardView) {
    if (!entry.legal || !view.isYourTurn) return;
    if (entry.card.kind === "Tigress") {
      setDecliningTigress(entry.card);
      return;
    }
    onPlayCard(entry.card);
  }

  function declareTigress(declaredAs: "Pirate" | "Escape") {
    if (decliningTigress === null) return;
    onPlayCard({ ...decliningTigress, declaredAs });
    setDecliningTigress(null);
  }

  return (
    <div>
      <h1>Round {view.currentRound}</h1>

      {view.outcome && (
        <p>
          {view.outcome.type === "Won"
            ? `${view.outcome.winnerName} won the Trick`
            : "Trick voided"}
        </p>
      )}

      <p>
        {view.isYourTurn
          ? "Your turn"
          : `Waiting for ${view.currentTurnPlayerName}`}
      </p>

      <h2>Trick in progress</h2>
      <ul>
        {view.currentTrick.map((play, index) => (
          <li key={`${play.playerName}-${index}`}>
            {play.playerName}
            {play.isSelf && " (You)"}
            {": "}
            {cardLabel(play.card)}
          </li>
        ))}
      </ul>

      <h2>Your hand</h2>
      <ul>
        {view.hand.map((entry, index) => (
          <li key={index}>
            <button
              type="button"
              disabled={!entry.legal || !view.isYourTurn}
              onClick={() => handleCardClick(entry)}
            >
              {cardLabel(entry.card)}
            </button>
          </li>
        ))}
      </ul>

      {decliningTigress && (
        <section>
          <p>Play the Tigress as:</p>
          <button type="button" onClick={() => declareTigress("Pirate")}>
            Play as Pirate
          </button>
          <button type="button" onClick={() => declareTigress("Escape")}>
            Play as Escape
          </button>
        </section>
      )}

      {error && <p role="alert">{error}</p>}

      <h2>Players</h2>
      <ul>
        {view.players.map((player) => (
          <li key={player.name}>
            {player.name}
            {player.isSelf && " (You)"}
            {": "}
            {player.tricksWon} Trick(s) won
            {player.isCurrentTurn && " (current turn)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
