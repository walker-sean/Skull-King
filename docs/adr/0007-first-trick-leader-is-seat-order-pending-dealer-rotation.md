---
status: accepted
---

# The first Trick of a Round is led by seat order, pending real dealer rotation

The rulebook says "the player to the left of the dealer plays first each trick" and "the player to their left leads the first trick of the new round" — dealer rotates each Round. Nothing in the engine yet tracks a rotating dealer: `dealRound` always deals starting at `players[0]`, in the Room's stable seat order (see `packages/engine/src/dealing.ts`), and ticket 04 shipped without introducing a dealer concept. Rather than invent dealer rotation as a side effect of this ticket, `startGame` sets `trickLeader` to `players[0]` for Round 1's first Trick — the same seat `dealRound` already treats as the deal's starting point — and `playCard` carries that forward by having each Trick's winner lead the next.

This is a placeholder, not a ruling: once dealing rotates a real dealer (if a later ticket adds it), the "first Trick of a Round" leader should become "the player to the current dealer's left" instead of always `players[0]`. Until then, every Round in this v1 slice starts its first Trick with the same Player, which matches today's non-rotating deal.
