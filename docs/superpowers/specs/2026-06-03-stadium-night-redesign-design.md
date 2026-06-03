# MundialQuiz — "Stadium Night" Redesign

**Date:** 2026-06-03
**Type:** Visual redesign + motion upgrade (no game-logic changes)

## Goal

Re-skin the existing MundialQuiz trivia app to a young, fun, energetic look for the
soccer World Cup 2026, using a new brand palette and adding playful, bouncy
animations and transitions throughout. No changes to `lib/`, hooks, data, or game
behavior — purely the presentation layer.

## Palette

Provided brand colors, re-anchored to semantic roles (the old theme leaned on a
gold/yellow that is **not** in the new palette, so "score" and "primary action"
are re-assigned to green):

| Token (`@theme`)     | Hex                       | Role |
|----------------------|---------------------------|------|
| `--color-navy`       | `#2A398D`                 | Brand surface — cards, header, badges |
| `--color-navy-deep`  | `#18225c` *(derived)*     | Page background base (gradient top, darker) |
| `--color-green`      | `#3CAC3B`                 | Primary / "go" / correct / score |
| `--color-red`        | `#E61D25`                 | Urgent / wrong / accent / cash-out |
| `--color-gray-light` | `#D1D4D1`                 | Muted text, secondary labels |
| `--color-gray-dark`  | `#474A4A`                 | Glass borders, inert surfaces |

Theme base: **Stadium Night (dark)** — deep navy night-sky background with vibrant
green + red pops.

Background (`MemphisBackground`, name retained): navy-deep→navy vertical gradient
with recolored ambient glow blobs (green / red / navy) and the existing dot-grid
overlay. Old magenta/cyan/gold blobs are replaced.

## Component role mapping

- **Button** (`components/ui/Button.tsx`): variants become
  `primary` (green, dark text), `accent` (red, white text), `ghost` (glass:
  `gray-dark`/white border). The old `gold` variant is removed. Migrations:
  - "Siguiente →" / "Ver resultados" / "Jugar de nuevo" → `primary` (green)
  - "Retirarme con N pts 🪙" (cash-out) → `accent` (red), so it reads as a
    deliberate, attention-drawing choice.
- **HUD** (`components/Hud.tsx`): score pill green; streak 🔥 pill glass; low-time
  pill pulses red (kept); question-counter glass; lives ❤️ glass.
- **Answer states** (4 format components): neutral glass option →
  correct flashes green, wrong shakes red.
- **Confetti** (`components/ui/Confetti.tsx`): recolored to
  `[green, red, navy, gray-light, white]` (drops magenta/cyan/purple).
- **Year-select & results** (`app/play/[mode]/page.tsx`): gold accents → green.

## Mode cards — rotating accents

Home shows 6 mode cards. Each card gets a **rotating accent** cycling
green / red / navy by index, applied as a colored top stripe + icon chip, for a
lively, varied grid. Hover lifts the card with a slight wiggle; accent color also
drives the hover glow.

## Motion (playful & bouncy) — no logic touched

- **Home** (`app/page.tsx`): heading drops in with a bounce; mode cards
  **stagger-in** with spring overshoot (parent `staggerChildren`); per-card hover =
  lift + tiny tilt/wiggle, tap = squish.
- **Buttons**: spring squish on tap, springy hover scale (tune existing tween to
  spring).
- **HUD**: score **counts up** with a pop via a new `AnimatedNumber` helper; streak
  pill shakes + scales when it increments.
- **Question card** (`components/QuestionCard.tsx`): springy slide-in (upgrade
  existing tween); answer options stagger-in; correct → green pop + confetti,
  wrong → red shake.
- **Results screen**: big score count-up + confetti burst + bouncy entrance.
- **Reduced motion**: existing `prefers-reduced-motion` CSS kill-switch in
  `globals.css` stays. `AnimatedNumber` snaps to the final value when reduced
  motion is requested (via `useReducedMotion`).

## Files touched

**Modified:**
- `app/globals.css` — redefine `@theme` tokens; background gradient on body.
- `app/layout.tsx` — body background gradient hook (if needed).
- `components/ui/MemphisBackground.tsx` — recolor blobs/gradient.
- `components/ui/Button.tsx` — variants + spring motion.
- `components/ui/Confetti.tsx` — palette colors.
- `components/ModeCard.tsx` — rotating accent (index prop), bouncy hover, stagger child.
- `components/Hud.tsx` — recolor, count-up score, streak shake.
- `components/QuestionCard.tsx` — recolor, springy entrance, staggered options.
- `components/formats/MultipleChoice.tsx` — correct/wrong color states + stagger.
- `components/formats/TrueFalse.tsx` — color states.
- `components/formats/OddOneOut.tsx` — color states.
- `components/formats/NumberInput.tsx` — recolor.
- `app/page.tsx` — stagger container + animated heading, pass card index.
- `app/play/[mode]/page.tsx` — gold→green, bouncy + count-up results.

**New:**
- `components/ui/AnimatedNumber.tsx` — spring count-up number, reduced-motion aware.

**Untouched:** everything in `lib/`, `hooks/`, data, tests, game state machine.

## Non-goals (YAGNI)

- No new game modes, screens, routes, or features.
- No sound effects.
- No new dependencies (framer-motion already present).
- No changes to question content or scoring.
