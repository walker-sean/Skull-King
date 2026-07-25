---
status: accepted
---

# No accounts for v1; reconnect by Room Code + display name

Players join a Room with just a Room Code and a display name — there's no login, password, or persistent identity. When a Player disconnects mid-Game, the Room pauses and waits; they resume their seat by rejoining with the same Room Code and name, with nothing to prove that's really them.

This is a real trade-off, not an oversight: it means anyone with the Room Code could type an existing Player's name and take their seat. We accepted that risk because this app is scoped to a small, trusted friend group, not a public matchmaking product — the social context (everyone's already on a call together) does the identity-checking that auth would otherwise do. If this project ever grows beyond a closed friend group, or accounts get added (a real candidate for a future feature), this decision should be revisited — name-based reconnection is exactly the kind of thing that stops being safe at a larger scale.
