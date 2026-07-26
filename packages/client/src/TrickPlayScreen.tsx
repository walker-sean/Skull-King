import { useState } from "react";
import type { Alliance, Card, PirateAbilityEffect } from "@skull-king/shared";
import { cardLabel } from "./cardLabel.js";
import { PirateAbilityPanel } from "./PirateAbilityPanel.js";
import type { PirateAbilityViewModel } from "./viewModel/pirateAbilityViewModel.js";
import type {
  HandCardView,
  TrickPlayViewModel,
} from "./viewModel/trickPlayViewModel.js";

type TigressCard = Extract<Card, { kind: "Tigress" }>;

export interface TrickPlayScreenProps {
  view: TrickPlayViewModel;
  error: string | null;
  onPlayCard: (card: Card) => void;
  pirateAbility: PirateAbilityViewModel | null;
  onInvokePirateAbility: (effect: PirateAbilityEffect) => void;
  peekedCards: Card[] | null;
  drawnCards: Card[] | null;
  allianceBanner: Alliance | null;
  disabled?: boolean;
}

export function TrickPlayScreen({
  view,
  error,
  onPlayCard,
  pirateAbility,
  onInvokePirateAbility,
  peekedCards,
  drawnCards,
  allianceBanner,
  disabled = false,
}: TrickPlayScreenProps) {
  const [decliningTigress, setDecliningTigress] = useState<TigressCard | null>(
    null,
  );

  function handleCardClick(entry: HandCardView) {
    if (disabled || !entry.legal || !view.isYourTurn || pirateAbility) return;
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
    <div className="screen">
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
      <ul className="card-grid">
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
      {/* Disabled while any Advanced Pirate Ability is pending — the server already
          rejects PlayCard with PirateAbilityPending until it's invoked. */}
      <ul className="card-grid">
        {view.hand.map((entry, index) => (
          <li key={index}>
            <button
              type="button"
              disabled={
                disabled ||
                !entry.legal ||
                !view.isYourTurn ||
                pirateAbility !== null
              }
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
          <div className="button-row">
            <button
              type="button"
              disabled={disabled}
              onClick={() => declareTigress("Pirate")}
            >
              Play as Pirate
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => declareTigress("Escape")}
            >
              Play as Escape
            </button>
          </div>
        </section>
      )}

      {error && <p role="alert">{error}</p>}

      {allianceBanner && (
        <p role="status">
          Loot Alliance formed between {allianceBanner.lootPlayerName} and{" "}
          {allianceBanner.winnerName}!
        </p>
      )}

      {pirateAbility && (
        <PirateAbilityPanel
          view={pirateAbility}
          onInvoke={onInvokePirateAbility}
          disabled={disabled}
        />
      )}

      {peekedCards && (
        <section>
          <h2>Undealt cards you peeked at</h2>
          <ul className="card-grid">
            {peekedCards.map((card, index) => (
              <li key={index}>{cardLabel(card)}</li>
            ))}
          </ul>
        </section>
      )}

      {drawnCards && (
        <p role="status">
          You drew: {drawnCards.map((card) => cardLabel(card)).join(", ")}
        </p>
      )}

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
