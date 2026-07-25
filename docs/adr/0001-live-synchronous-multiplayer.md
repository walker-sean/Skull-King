---
status: accepted
---

# Live, synchronous multiplayer instead of async turn-by-turn

The obvious alternative for a "play with friends who are somewhere else" card game is async — like Words With Friends, where a player gets notified it's their turn and responds whenever. We chose live/synchronous instead: all Players connect to a Room and play in real time, typically while on a call together.

This was a deliberate trade against build simplicity. Async would have avoided websockets, presence, and reconnect-mid-Trick handling entirely. We took on that complexity because the actual use case is a group that's already coordinating in real time (on a call) and wants the game to feel like sitting at a table, not a slow-burn asynchronous game. This decision is why the Room has a Paused status and a pause-and-wait disconnect model (see ADR-0002) — neither would exist under an async design.
