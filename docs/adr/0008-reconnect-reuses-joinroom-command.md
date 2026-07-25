---
status: accepted
---

# Reconnect reuses the JoinRoom command; disconnect pauses immediately with no grace period

CONTEXT.md already treats joining and rejoining as the same action: "a Room is the unit of reconnection — leaving and rejoining with the same code and name resumes the same seat." Rather than adding a separate `Reconnect` command, wire event, and client flow, `joinRoom` (`packages/engine/src/joinRoom.ts`) now branches on Room status: in `Lobby` it behaves as before (add a new roster entry, reject a taken name); in `Active` or `Paused` it looks for an existing, disconnected Player whose name matches and resumes their seat instead — restoring `connected: true` without touching their `hand`, `bid`, or the Room's `currentTrick`/`currentRound`/`trickLeader`. A `Completed` Room rejects any join, new or returning. This keeps the wire protocol, the socket-session binding, and the client's existing Join Room form unchanged; only the engine's decision of "new roster entry vs. resume an existing one" changed.

Disconnect is the mirror case but isn't client-initiated — socket.io detects it server-side — so it's modeled as a `DisconnectCommand` the server calls internally (`packages/engine/src/disconnectPlayer.ts`) from its `socket.on("disconnect", ...)` handler, using the same pure `(state, command) -> EngineResult` shape as every other command for testability, but with no rejection path: an unknown Room, unknown Player, or already-disconnected Player is a silent no-op (there's no caller to reject to).

Two transition rules, chosen for simplicity in the absence of any stated requirement otherwise:

- **No grace period.** A single disconnect immediately pauses an Active Room (`RoomPaused`); there's no debounce window to absorb a brief network blip. CONTEXT.md and the issue this implements don't call for one, and adding one would need its own timer/expiry design this ticket doesn't ask for.
- **All-or-nothing resume.** A Paused Room returns to Active only once *every* roster Player is reconnected, not just the one who dropped — matching the issue's acceptance criterion literally ("once all previously-connected Players are back").

No actor check was added to either path, per ADR-0005's rule of only adding one where a domain rule says "only X may do this": reconnecting is a state-matching rule (name matches a disconnected seat), not a Host-only privilege, and ADR-0002 already accepts name-only reconnection as the intentional trust model for v1.

No persistence schema change was needed (`packages/persistence/src/roomStore.ts` already snapshots the full `RoomState`, `Paused` status and `currentTrick` included, per ADR-0003) — pause/resume just needed to be state the engine actually sets, which it now does.
