# Skull King

An online, live-multiplayer implementation of the Skull King trick-taking card game, played by a small group of friends over a call, from their phones or a browser.

See [CONTEXT.md](CONTEXT.md) for domain language and [docs/adr/](docs/adr/) for architectural decisions.

## Status

Early development. Implemented so far: Room creation & join (Lobby), Start Game (player-count gate + Scoring Mode selection), Round dealing with the Hand Size Cap, private simultaneous Bidding (hidden until every Player has bid, then revealed to all at once), Trick play — turn-order enforcement, follow-suit legality, and full Capture Hierarchy resolution (Escape < Suited Cards (Trump beats other Suits) < Pirate < Skull King < Mermaid, with a Mermaid always beating a Pirate or the Skull King regardless of play order, and a Tigress declared as Pirate or Escape at the moment it's played, with the winner leading the next Trick), Reconnect & Pause/Resume — a disconnecting Player pauses an Active Room until they rejoin with the same Room Code and name, resuming their hand, Bid, and any Trick in progress exactly, surviving a server restart — and the Advanced Cards: Loot (plays as an Escape but forms an Alliance with the Trick's winner unless the Loot's own Player wins it), Kraken (voids the Trick, with whoever would have won leading next), and White Whale (strips every card's identity and Suit so the highest number wins, itself voiding the Trick if no Suited card was played), with whichever of a Kraken or White Whale was played second taking precedence when both appear in the same Trick.

## Structure

An npm workspaces monorepo:

- `packages/shared` — types shared across packages
- `packages/engine` — game rules and state transitions
- `packages/persistence` — SQLite-backed storage
- `packages/server` — Socket.IO server
- `packages/client` — React client

## Development

```bash
npm install
npm run dev:server
npm run dev:client
```

```bash
npm test        # run all tests
npm run typecheck
npm run build
```
