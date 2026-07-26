import { useState } from "react";
import type { BiddingViewModel } from "./viewModel/biddingViewModel.js";

export interface BiddingScreenProps {
  view: BiddingViewModel;
  error: string | null;
  onSubmitBid: (bid: number) => void;
  disabled?: boolean;
}

export function BiddingScreen({
  view,
  error,
  onSubmitBid,
  disabled = false,
}: BiddingScreenProps) {
  const [bid, setBid] = useState(0);

  return (
    <div>
      <h1>Round {view.currentRound}</h1>
      <p>Your hand has {view.handSize} card(s).</p>

      {view.localHasBid ? (
        <p>Your Bid: {view.localBid}</p>
      ) : (
        <section>
          <h2>Submit your Bid</h2>
          <label htmlFor="bid">Bid</label>
          <input
            id="bid"
            type="number"
            min={0}
            max={view.handSize}
            value={bid}
            disabled={disabled}
            onChange={(event) => {
              const clamped = Math.min(
                Math.max(Number(event.target.value), 0),
                view.handSize,
              );
              setBid(Number.isNaN(clamped) ? 0 : clamped);
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSubmitBid(bid)}
          >
            Submit Bid
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      )}

      <ul>
        {view.players.map((player) => (
          <li key={player.name}>
            <span>{player.name}</span>
            {player.isSelf && <span> (You)</span>}
            {": "}
            {view.allBidsRevealed ? (
              <span>{player.bid}</span>
            ) : (
              <span>{player.hasBid ? "has bid" : "hasn't bid yet"}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
