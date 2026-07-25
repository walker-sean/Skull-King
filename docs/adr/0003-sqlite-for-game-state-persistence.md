---
status: accepted
---

# SQLite for Room/Game state persistence

Room and Game state is serialized to a SQLite file rather than kept only in memory. The natural first instinct for a live, ephemeral, no-accounts game is to keep everything in memory and skip a database entirely — and that would work fine for brief network drops.

It breaks down for the actual pattern this group plays: pausing a Game for a few hours (e.g., over dinner) and resuming later. In-memory-only state doesn't survive a server restart, a deploy, or a host's idle-timeout — any of which would silently wipe out a paused Game. SQLite gives durable state with no separate database server to run: it's a file on disk, requiring only a persistent volume on the host (see ADR-0004). We didn't reach for Postgres or Redis because there's no multi-writer or multi-instance need here — a single Node process owns each Room's state.
