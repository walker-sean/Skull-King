# Skull King

An online, live-multiplayer implementation of the Skull King trick-taking card game, played by a small group of friends over a call, from their phones or a browser.

## Language

### Session & Players

**Room**:
A live session identified by a shareable Room Code, joined by Players entering the code and a display name. No account is required; a Room is the unit of reconnection — leaving and rejoining with the same code and name resumes the same seat.
_Avoid_: Lobby (a Room *has* a Lobby status; it isn't one), Session, Game (see below).

**Room Status**:
The Room's current phase: `Lobby` (waiting for the Host to start), `Active` (a Round is in progress), `Paused` (a Player has disconnected and the Room is waiting for them to reconnect), or `Completed` (all 10 Rounds finished).

**Host**:
The Player who created the Room and is the only one who can start the Game once 3–8 Players have joined the Lobby.
_Avoid_: Owner, Admin.

**Player**:
A participant in a Room, identified only by the display name they chose when joining — not by an account.

**Game**:
One full playthrough of all 10 Rounds within a Room, played under a single Scoring Mode chosen by the Host before it starts. A Room hosts exactly one Game for v1.

### Rounds & Bidding

**Round**:
One of the Game's 10 fixed rounds. Round N deals N cards to each Player, except where the Hand Size Cap reduces that count.

**Hand Size Cap**:
The largest hand size the Deck can support for the Game's Player count (`floor(74 ÷ player count)`). Once a Round's number exceeds the cap, that Round — and every Round after it — deals the capped size instead of increasing further. Only affects 8-Player Games (capped at 9 for Round 10); 3–7 Players always get the Round's full number.

**Bid**:
A Player's private prediction, made once per Round, of how many Tricks they'll take that Round. All Bids stay hidden until every Player has bid, then are revealed simultaneously.
_Avoid_: Prediction, Guess.

**Trick**:
One card played by each Player in turn order, ranked by the Capture Hierarchy. Whoever plays the winning card takes the Trick and leads the next one.

### Cards & Capture

**Deck**:
The 74 cards in play for this project's ruleset: 56 Suited Cards, 5 Pirates, 1 Tigress, 1 Skull King, 2 Mermaids, 5 Escapes, 2 Loot, 1 Kraken, 1 White Whale. Source of truth: `docs/rules/skull-king-rulebook.pdf`.

**Suit**:
One of four card groups, each numbered 1–14: Parrot (green), Treasure Chest (yellow), Pirate Map (purple), and Jolly Roger (black — the Trump Suit).

**Trump Suit**:
Jolly Roger (black). A Trump Suit card beats a card from any other Suit regardless of number.

**Special Card**:
A card with no number and no Suit (Escape, Pirate, Tigress, Skull King, Mermaid, Loot, Kraken, White Whale). Can be played on any turn regardless of the lead Suit.

**Capture Hierarchy**:
The fixed rank order deciding a Trick's winner: Escape < Suited Cards (Trump Suit beats other Suits) < Pirate < Skull King < Mermaid. A Mermaid in a Trick always wins over a Pirate and a Skull King, regardless of play order.

**Pirate**:
One of 5 individually named Special Cards that outrank all Suited Cards. Winning a Trick by playing a specific named Pirate — not just capturing a generic pirate — unlocks that Pirate's Advanced Pirate Ability.
_Avoid_: treating the 5 Pirates as interchangeable — their identity matters once Advanced Pirate Abilities are in play.

**Tigress**:
A Special Card the Player declares as either a Pirate or an Escape at the moment it's played.

**Escape**:
A Special Card that always loses a Trick; played to guarantee not winning it.

### Advanced Cards

**Loot**:
A Special Card that plays as an Escape but, if the Trick it's in is won by a different Player than whoever played it, forms an Alliance between those two Players.

**Alliance**:
A bonus-sharing pairing formed by a Loot card between whoever played it and whoever won that Trick. Only pays out if both Players hit their Bid that Round.

**Kraken**:
A Special Card that voids the Trick entirely: no one wins it, the played cards are set aside, and whoever would have won leads the next Trick instead.

**White Whale**:
A Special Card that strips every card in the Trick of its Special-Card identity and Suit, so the highest number played wins regardless of color. If a Kraken and a White Whale are played in the same Trick, whichever was played second determines which effect applies.

**Advanced Pirate Ability**:
A one-time power unlocked by winning a Trick by playing a specific named Pirate (e.g., choosing who leads the next Trick, adjusting one's own Bid). Usable only by the Player who won that Trick.

### Scoring

**Scoring Mode**:
The Room-level setting, chosen by the Host before the Game starts, that determines how a Round's Bid result converts to points. Fixed for the whole Game — not switchable mid-Game. One of Traditional Scoring or Rascal Scoring.
_Avoid_: Scoring Variant, Ruleset (Ruleset refers to which cards are in the Deck, not how points are scored).

**Traditional Scoring**:
A Scoring Mode where hitting a Bid exactly scores points per Trick taken, and missing it costs points per Trick of difference. Source of truth: `docs/rules/skull-king-rulebook.pdf`.

**Rascal Scoring**:
A Scoring Mode where every Player has the same potential score each Round regardless of their Bid, earned in full, half, or none depending on the Round's Outcome (Direct Hit, Glancing Blow, or Complete Miss). Source of truth: `docs/rules/skull-king-rascal-scoring.pdf`.

**Outcome** (Direct Hit / Glancing Blow / Complete Miss):
The three Bid-accuracy results Rascal Scoring uses to decide how much of a Round's potential score — and Bonus — a Player earns: exact Bid, off by one, and off by two or more.

**Bonus**:
Extra points awarded for capturing specific cards in a Trick — the Trump Suit's #14, and the Mermaid–Pirate–Skull King capture chain — on top of a Round's Bid score.
