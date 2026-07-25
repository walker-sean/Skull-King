# Skull King

An online, live-multiplayer implementation of the Skull King trick-taking card game, played by a small group of friends over a call, from their phones or a browser.

See [CONTEXT.md](CONTEXT.md) for domain language and [docs/adr/](docs/adr/) for architectural decisions.

## Status

Early development. Implemented so far: Room creation & join (Lobby), Start Game (player-count gate + Scoring Mode selection), and Round dealing with the Hand Size Cap.

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
