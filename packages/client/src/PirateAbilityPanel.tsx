import { useState } from "react";
import type { PirateAbilityEffect, PirateName } from "@skull-king/shared";
import { isValidBidAdjustment } from "@skull-king/engine";
import { cardLabel } from "./cardLabel.js";
import type { PirateAbilityViewModel } from "./viewModel/pirateAbilityViewModel.js";

export interface PirateAbilityPanelProps {
  view: PirateAbilityViewModel;
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled?: boolean;
}

const PIRATE_DISPLAY_NAMES: Record<PirateName, string> = {
  RosieDLaney: "Rosie D'Laney",
  HarryTheGiant: "Harry the Giant",
  BendtTheBandit: "Bendt the Bandit",
  RascalOfRoatan: "Rascal of Roatan",
  JuanitaJade: "Juanita Jade",
};

function RosieDLaneyForm({
  view,
  onInvoke,
  disabled,
}: {
  view: PirateAbilityViewModel;
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled: boolean;
}) {
  const [chosenLeaderName, setChosenLeaderName] = useState(
    view.playerNames[0] ?? "",
  );

  return (
    <>
      <label htmlFor="chosen-leader">Choose who leads the next Trick</label>
      <select
        id="chosen-leader"
        value={chosenLeaderName}
        disabled={disabled}
        onChange={(event) => setChosenLeaderName(event.target.value)}
      >
        {view.playerNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onInvoke({ pirateName: "RosieDLaney", chosenLeaderName })
        }
      >
        Choose Leader
      </button>
    </>
  );
}

function HarryTheGiantForm({
  view,
  onInvoke,
  disabled,
}: {
  view: PirateAbilityViewModel;
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled: boolean;
}) {
  const [bidAdjustment, setBidAdjustment] = useState<-1 | 0 | 1>(0);
  const currentBid = view.currentBid ?? 0;
  const newBid = currentBid + bidAdjustment;

  return (
    <>
      <p>Current Bid: {currentBid}</p>
      <div className="button-row">
        <button
          type="button"
          aria-pressed={bidAdjustment === -1}
          disabled={disabled || !isValidBidAdjustment(currentBid, view.handSize, -1)}
          onClick={() => setBidAdjustment(-1)}
        >
          -1
        </button>
        <button
          type="button"
          aria-pressed={bidAdjustment === 0}
          disabled={disabled}
          onClick={() => setBidAdjustment(0)}
        >
          0
        </button>
        <button
          type="button"
          aria-pressed={bidAdjustment === 1}
          disabled={disabled || !isValidBidAdjustment(currentBid, view.handSize, 1)}
          onClick={() => setBidAdjustment(1)}
        >
          +1
        </button>
      </div>
      <p>New Bid: {newBid}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInvoke({ pirateName: "HarryTheGiant", bidAdjustment })}
      >
        Confirm Bid Adjustment
      </button>
    </>
  );
}

function BendtTheBanditForm({
  view,
  onInvoke,
  disabled,
}: {
  view: PirateAbilityViewModel;
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled: boolean;
}) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  function toggle(index: number) {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((candidate) => candidate !== index);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, index];
    });
  }

  return (
    <>
      <p>Choose 2 cards to discard</p>
      <ul className="card-grid">
        {view.hand.map((card, index) => (
          <li key={index}>
            <button
              type="button"
              aria-pressed={selectedIndices.includes(index)}
              disabled={disabled}
              onClick={() => toggle(index)}
            >
              {cardLabel(card)}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled || selectedIndices.length !== 2}
        onClick={() =>
          onInvoke({
            pirateName: "BendtTheBandit",
            discard: [
              view.hand[selectedIndices[0]!]!,
              view.hand[selectedIndices[1]!]!,
            ],
          })
        }
      >
        Discard
      </button>
    </>
  );
}

function RascalOfRoatanForm({
  onInvoke,
  disabled,
}: {
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled: boolean;
}) {
  return (
    <>
      <p>Place a bet on hitting your Bid this Round</p>
      <div className="button-row">
        {([0, 10, 20] as const).map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => onInvoke({ pirateName: "RascalOfRoatan", bet: amount })}
          >
            Bet {amount}
          </button>
        ))}
      </div>
    </>
  );
}

function JuanitaJadeForm({
  onInvoke,
  disabled,
}: {
  onInvoke: (effect: PirateAbilityEffect) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onInvoke({ pirateName: "JuanitaJade" })}
    >
      Peek at the remaining Deck
    </button>
  );
}

export function PirateAbilityPanel({
  view,
  onInvoke,
  disabled = false,
}: PirateAbilityPanelProps) {
  const displayName = PIRATE_DISPLAY_NAMES[view.pirateName];

  if (!view.isSelf) {
    return (
      <section>
        <h2>Advanced Pirate Ability</h2>
        <p>
          {view.playerName} is invoking {displayName}&apos;s ability
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Advanced Pirate Ability: {displayName}</h2>
      {view.pirateName === "RosieDLaney" && (
        <RosieDLaneyForm view={view} onInvoke={onInvoke} disabled={disabled} />
      )}
      {view.pirateName === "HarryTheGiant" && (
        <HarryTheGiantForm view={view} onInvoke={onInvoke} disabled={disabled} />
      )}
      {view.pirateName === "BendtTheBandit" && (
        <BendtTheBanditForm view={view} onInvoke={onInvoke} disabled={disabled} />
      )}
      {view.pirateName === "RascalOfRoatan" && (
        <RascalOfRoatanForm onInvoke={onInvoke} disabled={disabled} />
      )}
      {view.pirateName === "JuanitaJade" && (
        <JuanitaJadeForm onInvoke={onInvoke} disabled={disabled} />
      )}
    </section>
  );
}
