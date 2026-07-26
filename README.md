# Skull King

An online, live-multiplayer implementation of the Skull King trick-taking card game, played by a small group of friends over a call, from their phones or a browser.

See [CONTEXT.md](CONTEXT.md) for domain language and [docs/adr/](docs/adr/) for architectural decisions.

## Status

Early development. Implemented so far: Room creation & join (Lobby), Start Game (player-count gate + Scoring Mode selection), Round dealing with the Hand Size Cap, private simultaneous Bidding (hidden until every Player has bid, then revealed to all at once), Trick play — turn-order enforcement, follow-suit legality, and full Capture Hierarchy resolution (Escape < Suited Cards (Trump beats other Suits) < Pirate < Skull King < Mermaid, with a Mermaid always beating a Pirate or the Skull King regardless of play order, and a Tigress declared as Pirate or Escape at the moment it's played, with the winner leading the next Trick), Reconnect & Pause/Resume — a disconnecting Player pauses an Active Room until they rejoin with the same Room Code and name, resuming their hand, Bid, and any Trick in progress exactly, surviving a server restart — the Advanced Cards: Loot (plays as an Escape but forms an Alliance with the Trick's winner unless the Loot's own Player wins it), Kraken (voids the Trick, with whoever would have won leading next), and White Whale (strips every card's identity and Suit so the highest number wins, itself voiding the Trick if no Suited card was played), with whichever of a Kraken or White Whale was played second taking precedence when both appear in the same Trick — and Advanced Pirate Abilities: winning a Trick by playing one of the 5 individually named Pirates unlocks that Pirate's one-time ability for the winner alone (Rosie D'Laney chooses who leads the next Trick, Harry the Giant adjusts their own Bid by plus or minus one, Bendt the Bandit draws 2 cards from the Round's undealt Deck and discards 2, Rascal of Roatan bets 10 or 20 points on hitting their Bid, and Juanita Jade privately looks through the undealt Deck) — and both Scoring Modes: once every Player's hand is empty, the Round is scored under whichever Mode the Host chose at Game start. Traditional Scoring awards +20 per Trick taken on an exact Bid hit, −10 per Trick of difference on a miss, or ±10 per card dealt that Round when bidding zero. Rascal Scoring instead gives every Player the same potential score (10 points per card dealt), earned in full on a Direct Hit, half on a Glancing Blow (off by one), or none on a Complete Miss (off by two or more) — and splits capturing a numbered-14 card (+10 standard Suit, +20 Trump Suit) or the Mermaid–Pirate–Skull King capture chain (+20/+30/+40) the same way, and resolves any pending Rascal of Roatan bet by winning or losing its full amount based on hitting the Bid. Under both Modes, Alliance bonuses of +20 pay out to each Allied Player only when both hit their Bid, and running score totals update for every Player after each Round — and Game completion: once a scored Round ends, the Game either deals the next Round fresh (a new hand per Player, Bid and Tricks Won reset, running score totals carried forward untouched, and the Trick leader rotating to the next Player in seat order) or, once Round 10 is scored, moves the Room to Completed status with the final scoreboard settled.

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
