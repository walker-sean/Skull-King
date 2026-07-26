# Skull King

An online, live-multiplayer implementation of the Skull King trick-taking card game, played by a small group of friends over a call, from their phones or a browser.

See [CONTEXT.md](CONTEXT.md) for domain language and [docs/adr/](docs/adr/) for architectural decisions.

## Status

Early development — the full game loop is implemented end-to-end:

- **Lobby & setup**: Room creation & join, Start Game (player-count gate + Scoring Mode selection)
- **Rounds**: dealing with the Hand Size Cap, private simultaneous Bidding (revealed once everyone has bid)
- **Trick play**: turn-order enforcement, follow-suit legality, full Capture Hierarchy resolution (including Tigress, Mermaid-vs-Pirate/Skull King precedence)
- **Reconnect & Pause/Resume**: a disconnecting Player pauses the Room until they rejoin, resuming hand/Bid/Trick exactly, surviving a server restart
- **Advanced Cards**: Loot (Alliance), Kraken (voids Trick), White Whale (strips identity/Suit), with second-played-wins precedence when both appear in a Trick
- **Advanced Pirate Abilities**: each of the 5 named Pirates unlocks a one-time ability for whoever wins a Trick with them
- **Scoring**: both Traditional and Rascal Scoring Modes, Alliance bonuses, running totals
- **Game completion**: Round-to-Round advancement and Completed status with final scoreboard after Round 10
- **Mobile-first UI**: every screen laid out for phone-sized viewports with touch-friendly tap targets

See [CONTEXT.md](CONTEXT.md) for the precise rules behind each of these.

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
