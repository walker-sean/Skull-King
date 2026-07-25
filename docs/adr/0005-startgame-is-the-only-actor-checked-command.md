---
status: accepted
---

# startGame is the only command with actor authorization

`startGame` checks that the caller is the Room's Host before it will run, but `createRoom` and `joinRoom` do not check who is calling at all — any socket that knows a Room Code and chooses a display name can join. This isn't an oversight: CONTEXT.md's Host glossary entry defines a "only one who can start the Game" rule, and that's the only "only X may do this" rule anywhere in the domain vocabulary. Creating a Room and joining one have no such restriction — nothing in the domain says only certain people may create or join — so there was nothing to authorize. We're authorizing commands because a domain rule requires it, not adding checks uniformly to every command as a matter of habit. The Host check itself relies on identity established the way ADR-0002 describes: since there are no accounts, a socket is bound to the Player it created the Room as or joined as, and `startGame` reads that binding to confirm the caller is the Host of the Room they're trying to start.

If a future command introduces its own "only X may do this" rule — for example a Host-only kick-a-player action, or a pause/resume feature restricted to the Host — that command should get the same actor-check treatment `startGame` has now. Until then, `createRoom` and `joinRoom` staying open is intentional, not a gap to be closed reflexively.
