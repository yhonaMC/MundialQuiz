# MundialTrivia — Hub + "La Incógnita Mundialera"

> Nombre del juego: **La Incógnita Mundialera**. Ruta `/incognita`, código en
> `lib/incognita`, `components/incognita`. (Antes se llamaba "La Incógnita Mundialera".)

**Date:** 2026-06-03
**Type:** Rebrand + app restructure (multi-game hub) + new game (soccer Wordle)

## Context

The app was a World-Cup trivia *quiz* (modes at `/play/[mode]`), just re-skinned to the
"Stadium Night" palette with bouncy animations. The user now wants it to become a
**multi-game hub** of World-Cup games, renamed **MundialTrivia**, with the first new
game being a Spanish Wordle (à la lapalabradeldia.com) themed on soccer
players/teams.

The user dropped three large JSON datasets in the repo root (≈8 MB each), covering
**1930–2026**:
- `fifa-world-cup-men-players-1930-2026.flat.json` — 12,221 players (incl. **1,248 for 2026**).
- `fifa-world-cup-men-squads-1930-2026.grouped.json` — 23 tournaments w/ host, winner
  (2026 = null, not played), team list, squads, coaches.
- `fifa-world-cup-men-1930-2026-json-server-db (1).json` — combined json-server DB.

These raw files must **not** ship to the client (size). They are processed at dev time
into compact committed data modules.

## Scope

### Phase 1 (this spec)
1. **Rebrand → MundialTrivia** (title, header, metadata).
2. **Home becomes a hub**: featured "Juego del día → La Incógnita Mundialera" + a
   "Modos de Quiz" section with the existing 6 mode cards. Existing quiz flow unchanged.
3. **New game "La Incógnita Mundialera"** at route `/incognita`.

### Phase 2 (separate, next)
- Use the 1930–2026 dataset to extend the quiz to all editions; add **2026** with
  player/host/squad questions (NOT champion/golden-boot, which don't exist yet).
- **Year selector before starting** any compatible quiz mode ("Todos los años" or one year).

## La Incógnita Mundialera — rules & design

- Guess the hidden name in **6 attempts**. The answer is a **soccer player surname or a
  national team** (Spanish), **variable length 4–8**; the board adapts to the day's length.
- A **brief hint** is shown above the board (e.g. "Jugador · Argentina" / "Selección ·
  Sudamérica").
- **Per-tile feedback** after each guess: **green** = right letter, right position;
  **amber/yellow** = letter present, wrong position; **gray** = not present. Tiles
  **flip** to reveal (bouncy). On-screen + physical keyboard; keys tint by best state.
- **Validity:** a guess is accepted only if it is a real WC name (player surname or
  team) of the same length, from our dictionary; otherwise show "Esa palabra no está en
  la lista" and **do not consume an attempt** (Wordle behavior).
- **Daily:** one word per day, same for everyone, chosen deterministically by date.
  Today's progress (guesses + status) persists in localStorage; replaying the same day
  shows the finished state.
- **Normalization:** matching ignores accents and case (`JOSÉ` == `JOSE`); `Ñ` kept as a
  distinct letter. Display uses normalized uppercase.
- **End states:** win → confetti + bounce; loss → reveal the answer.

### Colors (game semantics override brand palette)
The brand palette has no yellow, but Wordle semantics require it. Add a **game-only**
token `--color-amber` (#e3a008-ish) for the "present, wrong spot" tile. Green reuses
`--color-green` (#3CAC3B); absent reuses `--color-gray-dark` (#474A4A); empty tiles use
white/10 with gray borders.

## Architecture

### Data (compact, committed; raw JSON not bundled)
- A dev script `scripts/build-incognita.mjs` reads the raw JSONs and emits:
  - `lib/incognita/data/answers.ts` — curated daily-answer bank: `{ word, hint, category }[]`.
    Hand-curated for quality (recognizable players + all relevant selecciones, Spanish
    names, length 4–8). ~150–250 entries.
  - `lib/incognita/data/validGuesses.ts` — `Set<string>` of accepted guesses (normalized,
    length 4–8): real WC player surnames + team names. Strings only (~tens of KB).
- Raw JSONs moved to `data-sources/` and git-ignored (kept locally for Phase 2 regen).

### Pure logic (unit-tested with vitest, TDD)
- `lib/incognita/evaluate.ts` — `evaluate(guess, answer): TileState[]` where
  `TileState = 'correct' | 'present' | 'absent'`. **Must handle duplicate letters**
  correctly (two-pass: mark greens first, then consume remaining answer-letter counts
  for yellows). This is the riskiest logic → tests first.
- `lib/incognita/normalize.ts` — uppercase + strip accents (keep Ñ).
- `lib/incognita/dictionary.ts` — `isValidGuess(word)` against the normalized valid set.
- `lib/incognita/daily.ts` — `getDailyAnswer(date): {word,hint}` deterministic by date
  (index = days-since-epoch mod bank length, over a stable shuffled order).
- `lib/incognita/keyboardState.ts` — derive per-letter best state from past guesses.

### Persistence
- `lib/incognita/storage.ts` — load/save `{ dateKey, guesses: string[], status }` in
  localStorage, namespaced (`mundialtrivia:incognita:<dateKey>`). Reuses patterns from the
  existing `lib/storage/localStore.ts`.

### UI (client components, framer-motion, Stadium Night style)
- `app/incognita/page.tsx` — the game screen (MemphisBackground, hint, board, keyboard,
  toast for invalid words, end state).
- `components/incognita/Board.tsx` — grid of rows (6 × N), flip-reveal animation.
- `components/incognita/Tile.tsx` — single tile with state color + flip.
- `components/incognita/Keyboard.tsx` — on-screen QWERTY (ES) + `Ñ`, Enter, Backspace;
  keys colored by `keyboardState`.
- `components/incognita/Toast.tsx` — transient "no está en la lista" message.

### Home / hub + rebrand
- `app/layout.tsx` — metadata title → MundialTrivia.
- `app/page.tsx` — restructure into: hero title; "Juego del día" featured card
  (→ `/incognita`); "Modos de Quiz" heading + existing `ModeCard` grid.
- Header brand text → "Mundial**Trivia**".

## Files

**New:**
- `scripts/build-incognita.mjs`
- `lib/incognita/{evaluate,normalize,dictionary,daily,keyboardState,storage}.ts` (+ `*.test.ts` for evaluate/normalize/dictionary/daily)
- `lib/incognita/data/{answers,validGuesses}.ts`
- `app/incognita/page.tsx`
- `components/incognita/{Board,Tile,Keyboard,Toast}.tsx`

**Modified:**
- `app/page.tsx` (hub), `app/layout.tsx` (rename), `app/globals.css` (add `--color-amber`).
- `.gitignore` (ignore `data-sources/`).

**Untouched:** quiz engine, existing modes/flow (Phase 2 will touch them).

## Non-goals (Phase 1)
- No backend; daily word is computed client-side from a committed bank.
- No share-result string (can add later).
- No multi-language (Spanish only).
- Phase 2 items (2026 quiz, year selector, full-dataset migration) are out of scope here.
