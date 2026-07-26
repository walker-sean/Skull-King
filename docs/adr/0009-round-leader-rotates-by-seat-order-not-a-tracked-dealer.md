---
status: accepted
---

# Each Round's first Trick leader rotates by seat order, not a tracked dealer field

ADR-0007 left Round-to-Round leader rotation as a placeholder: every Round's first Trick
started with `players[0]` because nothing yet advanced past Round 1, and dealing wasn't
tied to any specific seat anyway (`dealRound` shuffles fresh each Round — see
`packages/engine/src/dealing.ts`). Ticket 13 (Game completion & final scoreboard) is the
first ticket to advance from one Round to the next, so it's the one that must resolve this.

The rulebook's rule is "the player to their left leads the first trick of the new round"
— a rotation relative to whoever dealt first, not tied to any other game state. Since
`dealRound` never actually tracked a distinguished "dealer" seat (it deals to every seat
identically regardless of Round), introducing a `dealer` field purely to rotate would be
state with no other reader. Instead, `advanceRound` (`packages/engine/src/roundAdvance.ts`)
derives the next Round's `trickLeader` directly from the Room's stable seat order and the
new Round number — `players[(round - 1) % players.length]` — which reproduces the same
"one seat further left each Round" rotation the rulebook describes, without adding a
`dealer` concept the engine has no other use for.

If a later ticket needs an explicit dealer (e.g. a "dealer's choice" Advanced rule), it
should read the current Round's leader-formula output as that dealer, rather than the
other way around.
