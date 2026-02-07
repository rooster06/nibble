# Games Feature - Design Document

## Overview

Add 3 party games to Nibble, accessible via a "Games" link in the header. All games are behind auth (existing middleware handles this). Games are designed to be played at the table while waiting for food - phone is passed around or used as a shared screen.

---

## Navigation

- Add a "Games" link in the header (`apps/web/app/layout.tsx`) next to the "Nibble" logo
- Route: `/games` - game selection hub showing all 3 games as cards
- Each game gets its own route: `/games/number-guess`, `/games/bad-choices`, `/games/stir-the-pot`

---

## Game 1: Number Guessing ("Guess the Number")

**Route:** `/games/number-guess`

**Concept:** The app picks a random number. Multiple players take turns guessing. After each guess, ChatGPT roasts the player Roman Roy-style (from Succession) while hinting if they're too high or too low. First to guess correctly wins - loser(s) pay the tab.

### Flow

1. **Setup screen:**
   - Enter player names (2+ players)
   - "Max number" input (default 100, user can change to any number)
   - "Pull the Lever" button (styled as a slot machine lever)

2. **Slot machine animation:**
   - Three reels spin with digits (like a Vegas slot machine)
   - Reels stop one by one left-to-right with a satisfying click
   - The reels DON'T reveal the actual number - after spinning they land on "???" or lock icons (the secret number is generated behind the scenes during the animation, players never see it)
   - The animation builds tension and feels more exciting than just pressing "Start"
   - Implementation: CSS animations on 3 digit columns, each with staggered `animation-delay` to stop sequentially
   - The lever itself: a draggable/tappable handle on the right side that animates down when pulled
   - On mobile: tap the lever (drag is fiddly on small screens)

3. **Game screen:**
   - Secret number is already generated (during slot animation) and stored in state
   - Shows whose turn it is (large, prominent name)
   - Number input field + "Submit Guess" button
   - After each guess, calls OpenAI API to generate a Roman Roy-style roast response that also hints whether the guess was too high or too low (e.g. "Oh wow, [name], that's embarrassingly high. Even a golden retriever with a calculator would know to go lower. But sure, take your time, we've got all night.")
   - Shows the roast response in a styled speech bubble / card
   - Tracks attempts per player and total rounds
   - On correct guess: winner celebration screen with Roman-style backhanded compliment (e.g. "Fine, [name] got it. Even a broken clock, right?")
   - Scoreboard showing each player's attempt count
   - "Play Again" button resets

4. **Give Up / End Game:**
   - Small "We Give Up" button in the corner (not prominent - quitters shouldn't have it easy)
   - On tap: reveals the secret number, then calls the API for a Roman Roy **maximum snark** group roast targeting the entire table (e.g. "The number was 42. Forty-two. A table full of adults and not one of you could land on 42. Honestly, I've seen better collective brainpower at a dog park.")
   - System prompt for this case: "You are Roman Roy from Succession at your absolute most savage. An entire group just gave up trying to guess a number between 1 and [max]. The answer was [number] and they failed after [total rounds] rounds. Roast the entire group in 2-3 sentences. Maximum snark. Scorched earth."
   - Shows the roast in a big card, then "Play Again" button

3. **Turn rotation:**
   - Players go in order (round-robin)
   - Current player's name is highlighted
   - After submitting a guess, automatically moves to next player

### Random Number Generation

- Use `crypto.getRandomValues()` (Web Crypto API) for cryptographically random number generation - stronger than `Math.random()` which uses a PRNG
- Implementation: `crypto.getRandomValues(new Uint32Array(1))[0] % max + 1`
- This is seeded by the OS entropy pool (hardware interrupts, disk timing, mouse movements, etc.) - not a predictable seed like wall clock
- `Math.random()` would also work fine for a party game, but `crypto.getRandomValues` is just as easy and avoids any "the seed is predictable" concern
- Number is generated client-side when "Start Game" is tapped and stored in React state

### Comparison Logic (client-side, NOT LLM)

All number comparison is done in JavaScript on the client before calling the API. The LLM never sees the secret number and never does math.

```
Client computes:
  - direction: "high" | "low" | "correct"
  - distance: abs(guess - secretNumber)
  - proximity: "freezing" | "cold" | "warm" | "hot" | "correct"
    (based on distance as % of max: >50% = freezing, >25% = cold, >10% = warm, <=10% = hot)
```

If the guess is out of bounds (< 1 or > max), it's still accepted but:
- The turn is forfeited (counts as a wasted turn, moves to next player)
- The roast switches from Roman Roy to **Logan Roy** - harsher, more disappointed father energy
- Client sends `direction: "out_of_bounds"` to the API

These pre-computed facts are passed to the API route, which forwards them to ChatGPT:

```json
{
  "playerName": "Jake",
  "guess": 73,
  "direction": "high" | "low" | "correct" | "out_of_bounds",
  "proximity": "freezing" | "cold" | "warm" | "hot" | "correct" | "out_of_bounds",
  "attempts": 3,
  "maxNumber": 100
}
```

The LLM's only job is creative writing - turning `{ direction, proximity }` into a roast. It never compares numbers. For `out_of_bounds`, the system prompt switches to Logan Roy's voice instead of Roman's.

### Roman Roy Roast Integration

- Uses the existing OpenAI API key (already in the backend for menu extraction)
- New Next.js API route: `POST /api/games/roast`
- Normal guesses: System prompt is Roman Roy - witty, sarcastic, hints at direction/proximity
- Out-of-bounds guesses: System prompt switches to **Logan Roy** - cold, disappointed, brutal father energy (e.g. "You're telling me you guessed 150 on a scale of 1 to 100? This is why I can't leave you in charge of anything. You just lost your turn.")
- The prompt includes the pre-computed direction and proximity - the LLM just writes the roast
- Use `gpt-4o-mini` for speed and low cost (~0.01 cents per roast)

### UI

- Simple, clean card-based layout
- Large text for readability across the table
- Roast text displayed in a prominent styled card with quotation marks
- Color accents: current player highlighted
- Confetti or similar animation on correct guess

### State

- Client-side for ALL game logic: secretNumber, maxNumber, players[], currentPlayerIndex, guessHistory[], gameState (setup/playing/won)
- Client-side does all number comparison (high/low/distance/proximity)
- API call only for roast text generation (async, show a brief loading spinner while generating)

### Backend

- New Next.js API route at `apps/web/app/api/games/roast/route.ts`
- Calls OpenAI directly from the Next.js server (uses `OPENAI_API_KEY` env var)
- No Lambda needed - keeps it simple

---

## Game 2: Bad Choices

**Route:** `/games/bad-choices`

**Concept:** Digital version of the Bad Choices card game. Players take turns asking each other yes/no questions, trying to ask questions they think the other person will say "yes" to. First to discard all cards wins.

### Rules (from PDF)

- Each player is dealt 6 cards face-down
- On your turn, pick one of your cards and choose a player to ask
- If they answer "YES", discard that card. If "NO", keep it
- Special cards: SKIP (skip someone's turn), DRAW+1 (someone draws 1), DRAW+2 (someone draws 2), ALL PLAY (ask everyone - majority YES = discard)
- DRAW cards can be countered with another DRAW card (accumulates)
- When you have 1 card left, you must declare it to the group
- First to discard all cards wins

### Flow

1. **Setup screen:**
   - Enter player names (2-8 players)
   - "Start Game" button

2. **Game screen:**
   - Shows whose turn it is (large, prominent)
   - Shows that player's hand (cards face-up for the active player)
   - Player taps a card to use it
   - For question cards: shows the question, player selects who to ask
   - Target player answers YES or NO (two big buttons)
   - YES = card discarded with animation, NO = card returns to hand
   - For SKIP: select target player
   - For DRAW+1/DRAW+2: select target player, they draw cards. Target can counter with their own DRAW card
   - For ALL PLAY: everyone votes YES/NO, majority wins
   - "Skip Turn" button: swap out any number of cards for new ones from the deck
   - Card count shown for each player
   - Winner celebration screen

3. **Phone passing:**
   - Between turns, show a "Pass to [next player]" screen
   - Next player taps "Ready" to see their hand (prevents peeking)

### Card Data

~230 question cards extracted from the PDF, plus special cards (SKIP, DRAW+1, DRAW+2, ALL PLAY). Store as a TypeScript array in a data file.

Special cards to include in deck:
- 8x SKIP cards
- 8x DRAW+1 cards
- 8x DRAW+2 cards
- 16x ALL PLAY cards (questions that everyone answers)

### State

- All client-side
- Players array with name + hand (card array) + card count
- Deck (shuffled array of all cards)
- Discard pile
- Current player index
- Game phase: setup / playing / passing / winner

### File: `apps/web/lib/games/bad-choices-cards.ts`

Array of card objects:
```ts
type CardType = "question" | "skip" | "draw1" | "draw2" | "allplay";

interface Card {
  type: CardType;
  text: string; // question text (or action description for special cards)
}
```

---

## Game 3: Stir The Pot

**Route:** `/games/stir-the-pot`

**Concept:** Digital version of "Stir The Pot". Players draw cards with "who is most likely to..." questions, point at someone, then flip a token to decide if the card is read aloud or kept secret.

### Rules (from PDF)

- Player A draws a card and reads it to themselves
- Shows card to Player B (person to their left)
- Player B reads it and points to who in the circle fits the description most
- Player B flips the TELL / DON'T TELL token
- TELL = read the card aloud to the group (reveal who was pointed at)
- DON'T TELL = keep it a secret
- Continue in a circle
- "How to Win: Keep playing until everyone hates each other :)"

### Flow

1. **Setup screen:**
   - Enter player names (3-20 players)
   - Arrange in order (this determines who "Player B" is - person to the left)
   - "Start Game" button

2. **Game screen - Player A's view:**
   - "Your turn, [Player A name]"
   - "Draw a card" button
   - Card revealed with the question
   - "Pass to [Player B name]" button

3. **Pass screen:**
   - "Hand the phone to [Player B]"
   - Player B taps "Ready"

4. **Player B's view:**
   - Shows the card question
   - "Who fits this best?" - Player B points at someone (or just discusses out loud)
   - Big "FLIP THE TOKEN" button
   - Animated coin flip: lands on TELL or DON'T TELL (50/50 random)
   - If TELL: "Read it out loud!" - shows the card prominently
   - If DON'T TELL: "Keep it a secret!" - card is hidden
   - "Next Turn" button

5. **Continue:** Next player in circle becomes Player A

### Card Data

~117 "who is most likely to..." questions extracted from the PDF pages. Store as a string array.

### File: `apps/web/lib/games/stir-the-pot-cards.ts`

```ts
const stirThePotCards: string[] = [
  "Who will have the most lit funeral?",
  "Who would you find passed out in the bathtub at a party?",
  // ... ~115 more
];
```

### State

- All client-side
- Players array (ordered in circle)
- Card deck (shuffled)
- Current Player A index (Player B = next in array)
- Game phase: draw / pass / reveal / flip-result
- Used cards tracking (reshuffle when deck runs out)

### Token Flip Animation

- CSS animation of a coin/token spinning
- Lands on TELL (green) or DON'T TELL (red)
- Simple `Math.random() < 0.5` for the outcome
- 1-2 second animation before reveal

---

## File Structure

```
apps/web/
  app/
    api/
      games/
        roast/
          route.ts                # OpenAI roast endpoint for Number Guessing
    games/
      page.tsx                    # Game selection hub
      number-guess/
        page.tsx                  # Number guessing game
      bad-choices/
        page.tsx                  # Bad Choices game
      stir-the-pot/
        page.tsx                  # Stir The Pot game
  lib/
    games/
      bad-choices-cards.ts        # Bad Choices card data (~230 questions + special cards)
      stir-the-pot-cards.ts       # Stir The Pot card data (~117 questions)
```

## Files to Modify

- `apps/web/app/layout.tsx` - Add "Games" link in header

## Shared UI Patterns

- All games use the same card-based, rounded-xl styling as the rest of Nibble
- Primary color accents (primary-600) for buttons
- Dark mode support throughout
- Mobile-first (these will primarily be used on phones at a table)
- Large tap targets (buttons should be easy to press)

---

## What's NOT Needed

- No database storage - no game history or scores saved
- No real-time multiplayer/websockets - phone is passed around physically
- No user accounts tied to games - just enter names at start

## What IS Needed (backend)

- One new Next.js API route (`/api/games/roast`) for the Number Guessing game's Roman Roy roasts
- Uses OpenAI `gpt-4o-mini` via the `OPENAI_API_KEY` env var (needs to be added to Vercel env)
- Bad Choices and Stir The Pot are 100% client-side, no backend

---

## Open Questions

1. **Bad Choices - content filter?** The PDF questions are very adult/NSFW. Should we include all of them or filter some out? Could add a "spicy level" toggle.
2. **Card depletion:** When all cards have been drawn, reshuffle used cards back into the deck? Or end the game?
3. **OpenAI API key:** The backend Lambda has the key in Secrets Manager. For the Next.js roast route, we need `OPENAI_API_KEY` as a Vercel env var. Is that already set up or do we need to add it?
