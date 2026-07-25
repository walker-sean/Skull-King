---
status: accepted
---

# submitBid gets the same actor-check treatment as startGame

CONTEXT.md's Bid glossary entry states a Bid is "a Player's private prediction, made once per Round" — an implicit "only that Player may submit their own Bid" rule, and a submitted Bid can't be changed. Per ADR-0005, any command backed by an "only X may do this" domain rule gets the same actor-check treatment as `startGame`: `submitBid` reads the caller's identity from their socket-bound session (`docs/adr/0002-no-accounts-reconnect-by-name.md`) rather than trusting a client-supplied Player name, so one Player can't submit a Bid on another's behalf. The immutability half of the rule ("can't be changed") is enforced the same way `startGame` enforces `RoomNotInLobby` — as an engine-level guard (`AlreadyBid`) against the Room's current state, not just a client-side disabled button.

Hiding and revealing Bids follows the precedent already set for hands (`redactHandsFor`, generalized here to `redactRoomStateFor`): the engine's `RoomState` always holds every Player's true Bid, and redaction happens only at the server's wire boundary, per Player, per broadcast. What's new is the reveal trigger — the engine exports `areAllBidsSubmitted`, a pure function over `RoomState`, so the "hidden until everyone's in, then revealed to everyone at once" timing is a state transition the engine computes and tests directly, not something inferred client-side from arrival order of `roomState` events.
