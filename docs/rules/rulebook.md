# Skull King — Rulebook

> Transcribed from `skull-king-rulebook.pdf` (Grandpa Beck's Games, © 2012, 2021, 2024). The PDF remains the canonical artifact for illustrations and exact wording; this file is the reference to read/grep when implementing game logic. If the two ever disagree, the PDF wins — update this file to match.

## Overview

Skull King is a trick-taking game played over **ten rounds**. In each round, players bid by predicting the number of tricks they'll win. A correct bid scores points; an incorrect bid loses points. The player with the highest score at the end wins.

## Deck Contents

| Group                              | Cards |
| ---------------------------------- | ----- |
| Suited: Parrot (green)             | 1–14  |
| Suited: Treasure Chest (yellow)    | 1–14  |
| Suited: Pirate Map (purple)        | 1–14  |
| Suited: Jolly Roger (black, trump) | 1–14  |
| Pirate                             | 5     |
| Tigress                            | 1     |
| Skull King                         | 1     |
| Mermaid                            | 2     |
| Escape                             | 5     |
| **Advanced:** Loot                 | 2     |
| **Advanced:** Kraken               | 1     |
| **Advanced:** White Whale          | 1     |

56 suited + 18 special (base) + 4 advanced = **74 cards total**.

Also included: player aid cards (16), bid reminder cards (16), blank cards (4), scorepad.

## Key Terms

- **Trick**: Each player plays one card, face up, in clockwise order. The highest-ranked card wins the trick.
- **Bid**: A player's prediction of how many tricks they'll take that round.
- **Round**: One or more tricks. The number of tricks in a round equals the number of cards dealt to each player.
  - Example: in round 3, three cards are dealt to each player; three tricks will be played.
- **Suited Cards**: Green, Purple, Yellow, and Black cards numbered 1–14.
- **Trump Suit**: Black (Jolly Roger) ranks higher than the other colored suits.
- **Special Cards**: Any card with no number.
  - Example: a green 14 is a lower rank than a black 1, because black is the trump suit.
- **Leading**: The first card played in a trick sets the suit that must be followed.

## Setup

1. Remove the following before starting (used only in the optional advanced rules): blank cards, Loot cards, Kraken, White Whale.
2. Distribute a player aid card and a set of bid reminder cards to each player.
3. Shuffle the remaining cards.
4. Deal cards to each player: 1 card in round 1, 2 in round 2, ... 10 in round 10.

**Hand size cap**: at 8 players, the maximum deal is 8 cards per hand; rounds 9 and 10 also deal 8. This concept generalizes to any group size — cap the deal at `floor(74 / player count)` once a round's number would exceed it, and hold every later round at that cap too.

## Game Play

### Bidding

Once cards are dealt, players examine their hand and decide how many tricks they believe they can win. When ready, a player places their fist on the table. Once all players are ready, they pound fists in unison three times chanting "Yo-ho-ho!" On the third pound, players extend fingers equal to their bid (closed fist = zero). Bids above five are verbalized. Bids stay hidden until revealed simultaneously on the final pound.

Bid reminder cards can be stacked to show a bid; for a bid of 10, place both cards face down. Record each player's bid on the score sheet.

### Playing

- The player to the left of the dealer plays first each trick; play continues clockwise.
- If a suited card is led, a player who holds that suit and chooses to play a suited card must follow suit.
- Special cards (no number) may be played on any turn regardless of the led suit.
- Once all players have played, the highest-ranked card wins the trick (see **The Cards** below). The winner takes the cards and leads the next trick.

## The Cards

### Suited Cards

Three standard suits — Parrot (green), Treasure Chest (yellow), Pirate Map (purple) — plus one trump suit, Jolly Roger (black). Each numbered 1–14.

- Must follow the led suit if a suited card is played and the player holds that suit.
- A special card may be played on any turn.
- If all cards in a trick are the same suit, the highest number wins.
- A non-trump suit played off-suit loses even if numerically highest.
- Trump (black) beats every standard-suit card regardless of number — even the lowest trump beats the highest non-trump.

### Special Cards

Special cards don't belong to a suit and can be played regardless of the led suit.

| Card           | Count | Rank / behavior                                                                                                                                |
| -------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pirate**     | 5     | Outranks all suited cards, including trump. If multiple Pirates are played in a trick, the first one played outranks the others.               |
| **Tigress**    | 1     | Declares itself as either a Pirate or an Escape at the moment it's played.                                                                     |
| **Skull King** | 1     | Beats all suited cards and Pirates (including a Tigress played as a Pirate). Only Mermaids outrank it.                                         |
| **Mermaid**    | 2     | Outranks the Skull King and all suited cards; loses to Pirates. If both Mermaids land in the same trick, the first played outranks the second. |
| **Escape**     | 5     | Always loses to every other card. If all played cards in a trick are Escapes (or cards acting as one), the first Escape played wins.           |

**Capture hierarchy**: Escape < Suited (trump beats other suits) < Pirate < Skull King < Mermaid.

> If a Pirate, the Skull King, and a Mermaid are all played in the same trick, the Mermaid always wins regardless of play order. The only bonus earned is for the Mermaid capturing the Skull King (see Bonus Points) — no Pirate-capture bonus is awarded because the Pirate didn't win.

### Leading with Special Cards

- **Leading with an Escape or a Tigress-as-Escape**: there's no lead suit to follow. If the next player also plays one of these, the third player sets the lead suit, and so on.
- **Leading with a character card** (Mermaid, Pirate, Skull King, or Tigress-as-Pirate): there is no lead suit at all — players may play any card they choose for the rest of the trick.

## Ending a Round

After all dealt cards are played, the round ends and scores are calculated. The player who dealt first that round shuffles and deals the next round; the player to their left leads the first trick of the new round.

## Ending the Game

At the end of ten rounds, scores are totaled and a winner declared. Ties are broken by playing another round.

## Scoring (Traditional)

Points are earned only if a player bids correctly; an incorrect bid loses points.

### Bidding One or More

- Exact bid hit: **+20 points per trick taken** that round.
- Missed bid (took more or fewer tricks than bid): **−10 points per trick of difference**.

```
Example: Calvin bids 3, takes 3 tricks → +60 (20 × 3).
Angela bids 2, takes 4 tricks → off by 2 → −20 (−10 × 2).
```

### Bidding Zero

- Bid zero and take zero tricks: **+10 points per card dealt that round**.
- Bid zero and take one or more tricks: **−10 points per card dealt that round**.

```
Example: Kate bids 0 on round 7 (7 cards dealt), takes 0 tricks → +70 (10 × 7).
Johnny bids 0 on round 9 (9 cards dealt), takes 2 tricks → −90 (−10 × 9).
```

## Bonus Points

Bonus points are earned **only if the player also hits their bid that round**. Order of play within the trick doesn't matter — only who ends up capturing the card.

| Bonus                                                            | Points   |
| ---------------------------------------------------------------- | -------- |
| Capturing a standard-suit (green/purple/yellow) numbered-14 card | +10 each |
| Capturing the trump-suit (black) numbered-14 card                | +20      |
| Capturing a Mermaid with a Pirate                                | +20 each |
| Capturing a Pirate with the Skull King                           | +30 each |
| Capturing the Skull King with a Mermaid                          | +40      |

```
Example: Lawrence leads a yellow 14; Charlotte plays a Pirate (hoping for the
Pirate-takes-Skull-King bonus); Anne plays the Skull King; Morgan plays a Mermaid
and wins the trick. Morgan earns +10 (yellow 14) + 40 (Skull King via Mermaid).
The Skull King did not win, so no Pirate-capture bonus is awarded.
```

## The Scoresheet

Columns: (A) Name, (B) Round, (C) Cards Dealt, (D) Bid and Result, (E) Bid Points, (F) Bonus, (G) Round Points, (H) Running Total, (I) Bid Type (only if using an alternative scoring method, e.g. Rascal — see [rascal-scoring.md](rascal-scoring.md)).

## Two-Player Rules

Deal 3 hands; the third stays face-down and is played by "Graybeard's ghost." Bidding and play follow normal rules; the two players alternate who leads each round. Regardless of who leads, Graybeard always plays second.

On Graybeard's turn, flip the top card of his hand and add it to the trick — he does not have to follow the lead suit. The winner of a trick leads the next one; if Graybeard wins, the player who led that round leads next and plays second. When Graybeard plays the Tigress, it plays as an Escape. Loot cards are not used in a 2-player game.

## Variable Card Counts

Optional shorter/alternate game lengths:

| Name                   | Cards per hand, per round           |
| ---------------------- | ----------------------------------- |
| Even Keeled            | 2, 4, 6, 8, 10                      |
| Skip to the Brawl      | 6, 7, 8, 9, 10                      |
| Swift-n-Salty Skirmish | 5 rounds of 5                       |
| Broadside Barrage      | 10 rounds of 10                     |
| Whirlpool              | 9, 7, 5, 3, 1                       |
| Past Your Bedtime      | 1 round of 1 (plus a goodnight hug) |

## Advanced Play Options

Advanced cards are a menu — include as many or as few as wanted.

### Kraken

When played, the trick is destroyed: no one wins it, and the played cards are set aside. The next trick is led by the player who _would have_ won the destroyed trick.

### White Whale

When played, every card in the trick loses its special-card identity and its suit; the highest number played wins the trick regardless of suit. If the highest number ties, the first one played wins. If only special cards were played (none numbered), the trick is discarded and the player who would have won leads the next trick.

If a Kraken and a White Whale are played in the same trick, **whichever was played second** determines which effect applies.

```
Example: Thomas leads black 2. Bill plays a Pirate. Susan plays yellow 14.
Lori plays the Skull King. Charlie plays the White Whale. All special cards
and suits are stripped; Susan's 14 (highest number) wins the trick.
```

### Loot Cards

Played as an Escape. Forms an **Alliance** between whoever played it and whoever wins that trick. If both players hit their bid that round, each is awarded **+20 bonus points**.

If a Loot card leads the trick, the next _suited_ card played sets the lead suit. If every other card played is an Escape (or the Tigress-as-Escape), the Loot player wins the trick — but no Alliance forms and no bonus is awarded (since the Loot player won their own trick).

### Advanced Pirate Abilities

Unlocked by **winning a trick by playing that specific named Pirate** (not merely by capturing a generic Pirate). The ability must be used immediately after the trick is won. Harry the Giant's ability is the only one usable after a round's final trick.

| Pirate           | Ability                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rosie D'Laney    | Choose any player, including yourself, to lead the next trick.                                                                                                        |
| Bendt the Bandit | Draw 2 cards from the deck into your hand, then discard 2.                                                                                                            |
| Rascal of Roatan | Optionally bet 10 or 20 points on getting your bid that round. Win the bet if you hit your bid, lose it if you don't. Declining the bet leaves your score unaffected. |
| Juanita Jade     | Privately look through the cards not dealt that round.                                                                                                                |
| Harry the Giant  | Change your own bid by plus or minus one, or leave it unchanged.                                                                                                      |

### Leading with Advanced Cards

If a player leads with a Kraken or White Whale, there is no lead suit to follow — subsequent cards played mid-trick don't need to match anything.

### Blank Cards

Use to replace lost/damaged cards or make custom cards.

## Attribution

Game Design: Brent Beck, Tauni Beck, Jeff Beck. Illustration: Apryl Stott. Graphic Design: David Bock, Brigette Indelicato. Copywriting: Chris Birk, Jeff Beck, Brent Beck, Cathy Bock, David Bock.

Skull King® is a Grandpa Beck's Games® property. All rights reserved © 2012, 2021, 2024.
