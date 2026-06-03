# Penales Quiz + Adivina el País — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el modo de trivia "Adivina el País" (preguntas jugador→selección desde la DB de jugadores, también mezcladas al pool general) y el juego independiente "Penales Quiz" (tanda al mejor de 5 contra la IA con reglas reales).

**Architecture:** Adivina el País = 2 generadores nuevos sobre `lib/db/players.ts` + extensión `generatorIds` en el selector + 1 modo nuevo. Penales = juego independiente del hub (patrón Incógnita/Conexión): reducer puro `lib/penales/shootout.ts` + IA probabilística `lib/penales/ai.ts` + hook `usePenales` + ruta `app/penales/`. El motor de trivia compartido solo recibe el passthrough de `generatorIds`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Framer Motion · lucide-react · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-03-penales-y-adivina-pais-design.md`

---

## Notas para quien implementa

- Rama de trabajo: crear `feat/penales-adivina-pais` desde `main` antes de la Task 1.
- **La marca actual es "JuegaMundial"** con tokens `--color-navy`, `--color-navy-deep`, `--color-green`, `--color-red`, `--color-amber`, `--color-gray-light` (ver `app/globals.css`). El ámbar es exclusivo de La Incógnita — no usarlo en Penales.
- Alias `@/*` → raíz del proyecto. Tests con Vitest (`npm test`, o `npx vitest run <ruta>`).
- Los iconos de modo son claves semánticas resueltas en `components/ui/ModeIcon.tsx` (lucide-react).
- `lib/db/players.ts` es AUTO-GENERADO (no editar); importar `PLAYERS` y el tipo `Player` de `lib/db/types`.
- UTF-8 siempre (usar Write tool): acentos, ⚽, 🧤, ✕, ⚡.
- Comandos de shell escritos para bash (disponible vía Bash tool en Windows).

## Mapa de archivos

```
lib/engine/questionGenerators/
  core.ts                 # NUEVO: interface Generator + makeOptions (extraídos de index.ts)
  index.ts                # MODIFICAR: importa de core, registra generadores nuevos
  playerCountry.ts        # NUEVO: player-country / player-country-hard
  playerCountry.test.ts   # NUEVO
lib/engine/generateQuestion.ts        # MODIFICAR: SelectOptions.generatorIds
lib/engine/generateQuestion.test.ts   # MODIFICAR: caso generatorIds
lib/modes/modes.ts                    # MODIFICAR: GameMode.generatorIds + modo adivina-pais
lib/modes/modes.test.ts               # MODIFICAR: 7 modos
components/ui/ModeIcon.tsx            # MODIFICAR: clave 'flag'
hooks/useGameSession.ts               # MODIFICAR: passthrough generatorIds
lib/penales/
  ai.ts            # NUEVO  + ai.test.ts
  shootout.ts      # NUEVO  + shootout.test.ts
lib/storage/localStore.ts             # MODIFICAR: SaveData.penales + recordPenales
lib/storage/localStore.test.ts        # MODIFICAR: tests nuevos
hooks/usePenales.ts                   # NUEVO
components/penales/Marcador.tsx       # NUEVO
app/penales/page.tsx                  # NUEVO
app/page.tsx                          # MODIFICAR: GameCard Penales + "7 modos"
```

---

## Task 0: Rama de trabajo

- [ ] **Step 1: Crear la rama**

```bash
git checkout main && git pull 2>/dev/null; git checkout -b feat/penales-adivina-pais
```
Expected: rama `feat/penales-adivina-pais` activa, árbol limpio (`git status --short` vacío).

---

## Task 1: Refactor — extraer `Generator` y `makeOptions` a `core.ts`

Para que los generadores nuevos reutilicen `makeOptions` sin import circular (index → playerCountry → index).

**Files:**
- Create: `lib/engine/questionGenerators/core.ts`
- Modify: `lib/engine/questionGenerators/index.ts` (solo las primeras ~25 líneas)

- [ ] **Step 1: Crear `lib/engine/questionGenerators/core.ts`**

Mover (copiar tal cual) la interface y el helper que hoy viven al inicio de `index.ts`:

```ts
import type { Question, QuestionFormat, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';

export interface Generator {
  id: string;
  difficulty: number;          // 1..5
  formats: QuestionFormat[];
  build(t: Tournament, all: Tournament[], rng: Rng): Question;
}

// Helper: arma 4 opciones de opción múltiple con la correcta + 3 distractores únicos.
export function makeOptions(correct: string, pool: string[], rng: Rng): { options: string[]; answerIndex: number } {
  const distractors = rng
    .shuffle(pool.filter((x) => x !== correct))
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 3);
  const options = rng.shuffle([correct, ...distractors]);
  return { options, answerIndex: options.indexOf(correct) };
}
```

- [ ] **Step 2: Actualizar `lib/engine/questionGenerators/index.ts`**

En `index.ts`: borrar la definición local de `interface Generator` y de `function makeOptions` (líneas tras los imports), y reemplazar la cabecera de imports por:

```ts
import type { Question, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import { NATIONAL_TEAMS } from '@/lib/data/teams';
import { makeOptions, type Generator } from './core';

export type { Generator } from './core';
```

(El resto del archivo — los 10 generadores y el array `GENERATORS` — queda igual. El `export type { Generator }` mantiene compatibles los imports existentes, p. ej. en `generateQuestion.ts`.)

- [ ] **Step 3: Verificar que nada se rompió**

Run: `npm test`
Expected: PASS — misma cantidad de tests que antes del refactor (todo verde).

- [ ] **Step 4: Commit**

```bash
git add lib/engine/questionGenerators/core.ts lib/engine/questionGenerators/index.ts
git commit -m "refactor: extract Generator and makeOptions to core module"
```

---

## Task 2: Generadores jugador→país

**Files:**
- Create: `lib/engine/questionGenerators/playerCountry.ts`
- Test: `lib/engine/questionGenerators/playerCountry.test.ts`
- Modify: `lib/engine/questionGenerators/index.ts` (registro en `GENERATORS`)

- [ ] **Step 1: Escribir el test**

Create `lib/engine/questionGenerators/playerCountry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { playerCountry, playerCountryHard } from '@/lib/engine/questionGenerators/playerCountry';
import { GENERATORS } from '@/lib/engine/questionGenerators';
import { TOURNAMENTS, getTournament } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';
import { PLAYERS } from '@/lib/db/players';

// confederación por país, derivada de la DB (para verificar distractores)
const CONF_BY_COUNTRY = new Map(PLAYERS.map((p) => [p.paisEs, p.confederacion]));
const COUNTRIES_PER_CONF = new Map<string, Set<string>>();
for (const p of PLAYERS) {
  if (!COUNTRIES_PER_CONF.has(p.confederacion)) COUNTRIES_PER_CONF.set(p.confederacion, new Set());
  COUNTRIES_PER_CONF.get(p.confederacion)!.add(p.paisEs);
}

function playerFromId(qid: string) {
  const pid = qid.split(':')[1];
  return PLAYERS.find((p) => p.id === pid)!;
}

describe('playerCountry generators', () => {
  it('are registered in GENERATORS', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(ids).toContain('player-country');
    expect(ids).toContain('player-country-hard');
  });

  it('produce a valid question for every tournament', () => {
    const rng = createRng(7);
    for (const gen of [playerCountry, playerCountryHard]) {
      for (const t of TOURNAMENTS) {
        const q = gen.build(t, TOURNAMENTS, rng);
        expect(q.format).toBe('multiple-choice');
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        expect(q.prompt).toContain('selección');
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('the correct answer is the player country (player identified by question id)', () => {
    for (let seed = 0; seed < 10; seed++) {
      const q = playerCountry.build(getTournament(2022)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      expect(player).toBeDefined();
      expect(q.options![q.answerIndex!]).toBe(player.paisEs);
      expect(q.prompt).toContain(player.nombre);
    }
  });

  it('distractors come from the same confederation when it has enough countries', () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = playerCountry.build(getTournament(2018)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      const confCountries = COUNTRIES_PER_CONF.get(player.confederacion)!;
      if (confCountries.size >= 4) {
        for (const opt of q.options!) {
          expect(CONF_BY_COUNTRY.get(opt)).toBe(player.confederacion);
        }
      }
    }
  });

  it('respects the tournament filter (player played that World Cup)', () => {
    for (let seed = 0; seed < 25; seed++) {
      const q = playerCountry.build(getTournament(2014)!, TOURNAMENTS, createRng(seed));
      const player = playerFromId(q.id);
      expect(player.mundiales).toContain(2014);
      expect(q.tournamentYear).toBe(2014);
    }
  });

  it('famous and hard populations target different players', () => {
    const famous = playerFromId(playerCountry.build(getTournament(2022)!, TOURNAMENTS, createRng(1)).id);
    expect(famous.campeon || famous.mundiales.length >= 3).toBe(true);
    const hard = playerFromId(playerCountryHard.build(getTournament(2022)!, TOURNAMENTS, createRng(1)).id);
    expect(hard.campeon).toBe(false);
    expect(hard.mundiales.length).toBeLessThan(3);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/questionGenerators/playerCountry.test.ts`
Expected: FAIL — módulo `playerCountry` inexistente.

- [ ] **Step 3: Implementar `lib/engine/questionGenerators/playerCountry.ts`**

```ts
import type { Question, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import type { Player } from '@/lib/db/types';
import { PLAYERS } from '@/lib/db/players';
import { NATIONAL_TEAMS } from '@/lib/data/teams';
import { makeOptions, type Generator } from './core';

// Poblaciones (calculadas una vez por módulo):
// famosos = campeones del mundo o con 3+ mundiales; el resto va al generador difícil.
const VALID = PLAYERS.filter((p) => p.paisEs && p.paisEs.length > 0);
const FAMOUS = VALID.filter((p) => p.campeon || p.mundiales.length >= 3);
const REST = VALID.filter((p) => !p.campeon && p.mundiales.length < 3);

// Países por confederación, derivados de la propia DB.
const COUNTRIES_BY_CONF: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const p of VALID) {
    (map[p.confederacion] ??= new Set()).add(p.paisEs);
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
})();

// Distractores: misma confederación; si no alcanza para 3 (p. ej. OFC),
// se completa con el pool global de selecciones.
function distractorPool(player: Player): string[] {
  const sameConf = (COUNTRIES_BY_CONF[player.confederacion] ?? []).filter((c) => c !== player.paisEs);
  if (sameConf.length >= 3) return sameConf;
  return [...sameConf, ...NATIONAL_TEAMS.filter((c) => c !== player.paisEs && !sameConf.includes(c))];
}

function buildFor(population: Player[], idPrefix: string, difficulty: number) {
  return (t: Tournament, _all: Tournament[], rng: Rng): Question => {
    // Respeta el filtro de torneo: jugadores que disputaron ese mundial.
    // Si la población no tiene ninguno de ese año, usa la población completa.
    const ofYear = population.filter((p) => p.mundiales.includes(t.year));
    const candidates = ofYear.length > 0 ? ofYear : population;
    const player = rng.pick(candidates);
    const { options, answerIndex } = makeOptions(player.paisEs, distractorPool(player), rng);
    return {
      id: `${idPrefix}:${player.id}`,
      format: 'multiple-choice',
      prompt: `¿Para qué selección jugó ${player.nombre} en los Mundiales?`,
      options,
      answerIndex,
      difficulty,
      tournamentYear: t.year,
      explanation: `${player.nombre} disputó ${player.mundiales.length} Mundial(es) con ${player.paisEs} (${player.mundiales.join(', ')}).`,
      tags: ['jugador', 'país'],
    };
  };
}

export const playerCountry: Generator = {
  id: 'player-country',
  difficulty: 2,
  formats: ['multiple-choice'],
  build: buildFor(FAMOUS, 'player-country', 2),
};

export const playerCountryHard: Generator = {
  id: 'player-country-hard',
  difficulty: 4,
  formats: ['multiple-choice'],
  build: buildFor(REST, 'player-country-hard', 4),
};
```

- [ ] **Step 4: Registrarlos en `GENERATORS`**

En `lib/engine/questionGenerators/index.ts`, añadir el import:
```ts
import { playerCountry, playerCountryHard } from './playerCountry';
```
y al final del array `GENERATORS` (tras `totalGoals`):
```ts
  playerCountry,
  playerCountryHard,
```

- [ ] **Step 5: Ejecutar tests del generador y la suite del motor**

Run: `npx vitest run lib/engine/questionGenerators/`
Expected: PASS — el test nuevo Y `index.test.ts` (que valida cada generador × cada torneo) en verde. Si `index.test.ts` falla por opciones duplicadas, revisa `distractorPool` — no "arregles" relajando el test.

- [ ] **Step 6: Commit**

```bash
git add lib/engine/questionGenerators
git commit -m "feat: add player->country question generators"
```

---

## Task 3: Extensión `generatorIds` (selector + GameMode + hook)

**Files:**
- Modify: `lib/engine/generateQuestion.ts`
- Modify: `lib/engine/generateQuestion.test.ts`
- Modify: `lib/modes/modes.ts` (solo la interface)
- Modify: `hooks/useGameSession.ts`

- [ ] **Step 1: Añadir el caso de test del selector**

En `lib/engine/generateQuestion.test.ts`, añadir dentro del `describe('generateQuestion', ...)`:

```ts
  it('restricts generators when generatorIds is provided', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateQuestion({
        ...base,
        targetDifficulty: 3,
        tournamentFilter: 'all',
        generatorIds: ['player-country', 'player-country-hard'],
        rng: createRng(i),
      });
      expect(q.id.startsWith('player-country')).toBe(true);
    }
  });
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/generateQuestion.test.ts`
Expected: FAIL — TypeScript no conoce `generatorIds` (error de tipos) o el filtro no se aplica.

- [ ] **Step 3: Implementar en `lib/engine/generateQuestion.ts`**

En `SelectOptions`, añadir el campo:
```ts
  generatorIds?: string[];           // restringe los generadores elegibles (por id)
```

Reemplazar `generatorsForDifficulty` por:
```ts
function generatorsForDifficulty(target: number, allowedIds?: string[]): Generator[] {
  const pool = allowedIds && allowedIds.length > 0
    ? GENERATORS.filter((g) => allowedIds.includes(g.id))
    : GENERATORS;
  // Ventana de ±1; si vacía, se ensancha progresivamente.
  for (let window = 1; window <= 5; window++) {
    const matches = pool.filter((g) => Math.abs(g.difficulty - target) <= window);
    if (matches.length > 0) return matches;
  }
  return pool.length > 0 ? pool : GENERATORS;
}
```

Y en `generateQuestion`, cambiar la línea que lo invoca a:
```ts
  const generators = generatorsForDifficulty(opts.targetDifficulty, opts.generatorIds);
```

- [ ] **Step 4: Añadir el campo a `GameMode`**

En `lib/modes/modes.ts`, dentro de `interface GameMode`, tras `allowCashOut?: boolean;`:
```ts
  generatorIds?: string[];       // restringe el modo a estos generadores (default: pool completo)
```

- [ ] **Step 5: Passthrough en el hook**

En `hooks/useGameSession.ts`, dentro de `pickQuestion`, en la llamada a `generateQuestion({...})`, añadir junto a `tournamentFilter: filter,`:
```ts
        generatorIds: mode.generatorIds,
```
y añadir `mode.generatorIds` al array de dependencias del `useCallback` de `pickQuestion` (junto a `filter, mode.difficultyRange, perTournament`).

- [ ] **Step 6: Ejecutar la suite y verificar**

Run: `npm test`
Expected: PASS — incluido el caso nuevo del selector.

- [ ] **Step 7: Commit**

```bash
git add lib/engine/generateQuestion.ts lib/engine/generateQuestion.test.ts lib/modes/modes.ts hooks/useGameSession.ts
git commit -m "feat: support restricting modes to specific generators via generatorIds"
```

---

## Task 4: Modo `adivina-pais` + icono + textos

**Files:**
- Modify: `lib/modes/modes.ts` (añadir el modo)
- Modify: `lib/modes/modes.test.ts`
- Modify: `components/ui/ModeIcon.tsx`
- Modify: `app/page.tsx` (texto "6 modos" → "7 modos")

- [ ] **Step 1: Actualizar el test de modos**

En `lib/modes/modes.test.ts`:

Reemplazar el caso `'defines exactly the 6 Group-A modes'` por:
```ts
  it('defines exactly the 7 modes', () => {
    expect(MODES.map((m) => m.id).sort()).toEqual(
      ['adivina-pais', 'contrarreloj', 'escalera', 'experto', 'maraton', 'por-mundial', 'supervivencia'].sort(),
    );
  });
```

Y añadir al final del `describe`:
```ts
  it('adivina-pais restricts to the player-country generators', () => {
    expect(getMode('adivina-pais')!.generatorIds).toEqual(['player-country', 'player-country-hard']);
  });
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/modes/modes.test.ts`
Expected: FAIL — son 6 modos, falta `adivina-pais`.

- [ ] **Step 3: Añadir el modo**

En `lib/modes/modes.ts`, añadir al final del array `MODES` (tras `experto`):
```ts
  {
    id: 'adivina-pais',
    name: 'Adivina el País',
    icon: 'flag',
    description: '¿Para qué selección jugó? Demuestra cuánto conoces a los mundialistas.',
    tournamentFilter: 'all',
    difficultyCurve: 'adaptive',
    questionCount: 10,
    generatorIds: ['player-country', 'player-country-hard'],
    scoring: { ...defaultScoring },
  },
```

- [ ] **Step 4: Registrar el icono**

En `components/ui/ModeIcon.tsx`:
- Añadir `Flag` al import de lucide-react: `import { Brain, Flag, Globe, Heart, Timer, TrendingUp, Trophy, type LucideIcon } from "lucide-react";`
- Añadir al `REGISTRY`: `flag: Flag,`

- [ ] **Step 5: Actualizar el texto del hub**

En `app/page.tsx`, en la `GameCard` del Quiz, cambiar el subtitle
de `"6 modos de trivia mundialista. Responde, suma puntos y supera tus rachas."`
a `"7 modos de trivia mundialista. Responde, suma puntos y supera tus rachas."`

- [ ] **Step 6: Verificar tests y build**

Run: `npx vitest run lib/modes/modes.test.ts` → PASS.
Run: `npm run build` → éxito (el modo nuevo aparece en `/quiz` automáticamente; verificación visual en la Task 11).

- [ ] **Step 7: Commit**

```bash
git add lib/modes/modes.ts lib/modes/modes.test.ts components/ui/ModeIcon.tsx app/page.tsx
git commit -m "feat: add adivina-pais quiz mode"
```

---

## Task 5: IA de penales (`lib/penales/ai.ts`)

**Files:**
- Create: `lib/penales/ai.ts`
- Test: `lib/penales/ai.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/penales/ai.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { aiShoots, questionDifficulty, AI_GOAL_PROBABILITY, NIVEL_DIFFICULTY, NIVELES } from '@/lib/penales/ai';
import { createRng } from '@/lib/engine/rng';

describe('aiShoots', () => {
  it('scores at a rate close to the configured probability (seeded)', () => {
    for (const nivel of NIVELES) {
      const rng = createRng(42);
      let goalsCount = 0;
      const N = 2000;
      for (let i = 0; i < N; i++) if (aiShoots(nivel, rng)) goalsCount++;
      const rate = goalsCount / N;
      expect(Math.abs(rate - AI_GOAL_PROBABILITY[nivel])).toBeLessThan(0.04);
    }
  });

  it('facil scores less often than dificil', () => {
    const a = createRng(7);
    const b = createRng(7);
    let facil = 0;
    let dificil = 0;
    for (let i = 0; i < 1000; i++) {
      if (aiShoots('facil', a)) facil++;
      if (aiShoots('dificil', b)) dificil++;
    }
    expect(dificil).toBeGreaterThan(facil);
  });
});

describe('questionDifficulty', () => {
  it('stays within the level range', () => {
    for (const nivel of NIVELES) {
      const rng = createRng(11);
      const [min, max] = NIVEL_DIFFICULTY[nivel];
      for (let i = 0; i < 200; i++) {
        const d = questionDifficulty(nivel, false, rng);
        expect(d).toBeGreaterThanOrEqual(min);
        expect(d).toBeLessThanOrEqual(max);
      }
    }
  });

  it('sudden death adds +1 capped at 5', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const d = questionDifficulty('dificil', true, rng);
      expect(d).toBeGreaterThanOrEqual(4); // [3,5] + 1 → [4,5] (tope 5)
      expect(d).toBeLessThanOrEqual(5);
    }
    const rng2 = createRng(3);
    for (let i = 0; i < 200; i++) {
      const d = questionDifficulty('facil', true, rng2);
      expect(d).toBeGreaterThanOrEqual(2); // [1,2] + 1 → [2,3]
      expect(d).toBeLessThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/penales/ai.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `lib/penales/ai.ts`**

```ts
import type { Rng } from '@/lib/engine/rng';

export type Nivel = 'facil' | 'normal' | 'dificil';

export const NIVELES: Nivel[] = ['facil', 'normal', 'dificil'];

// Probabilidad de que la IA anote su penal, por nivel.
export const AI_GOAL_PROBABILITY: Record<Nivel, number> = {
  facil: 0.5,
  normal: 0.65,
  dificil: 0.8,
};

// Rango de dificultad de TUS preguntas, por nivel de IA.
export const NIVEL_DIFFICULTY: Record<Nivel, [number, number]> = {
  facil: [1, 2],
  normal: [2, 3],
  dificil: [3, 5],
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

export function aiShoots(nivel: Nivel, rng: Rng): boolean {
  return rng.next() < AI_GOAL_PROBABILITY[nivel];
}

// Dificultad de la próxima pregunta: aleatoria dentro del rango del nivel;
// en muerte súbita sube +1 (tope 5) para el dramatismo.
export function questionDifficulty(nivel: Nivel, suddenDeath: boolean, rng: Rng): number {
  const [min, max] = NIVEL_DIFFICULTY[nivel];
  const d = min + rng.int(max - min + 1);
  return Math.min(5, suddenDeath ? d + 1 : d);
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/penales/ai.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/penales/ai.ts lib/penales/ai.test.ts
git commit -m "feat: add penalty AI with selectable level"
```

---

## Task 6: Máquina de estados de la tanda (`lib/penales/shootout.ts`)

**Files:**
- Create: `lib/penales/shootout.ts`
- Test: `lib/penales/shootout.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/penales/shootout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  shootoutReducer, initialShootoutState, goals, type ShootoutState,
} from '@/lib/penales/shootout';

function start(): ShootoutState {
  return shootoutReducer(initialShootoutState, { type: 'START' });
}

// Juega una ronda completa: tiro del jugador + tiro de la IA + (opcional) avanzar.
function playRound(s: ShootoutState, playerGoal: boolean, aiGoal: boolean, advance = true): ShootoutState {
  let st = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: playerGoal });
  if (st.winner === null) st = shootoutReducer(st, { type: 'AI_SHOT', goal: aiGoal });
  if (advance) st = shootoutReducer(st, { type: 'NEXT_ROUND' });
  return st;
}

describe('shootoutReducer', () => {
  it('START enters the question phase at round 1', () => {
    const s = start();
    expect(s.phase).toBe('question');
    expect(s.round).toBe(1);
    expect(s.playerShots).toEqual([]);
    expect(s.suddenDeath).toBe(false);
  });

  it('PLAYER_SHOT records the shot and moves to player-feedback', () => {
    let s = start();
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.phase).toBe('player-feedback');
    expect(s.playerShots).toEqual([true]);
    expect(s.winner).toBeNull();
  });

  it('AI_SHOT only works from player-feedback', () => {
    const s = start();
    expect(shootoutReducer(s, { type: 'AI_SHOT', goal: true })).toBe(s);
  });

  it('a full round advances the round counter', () => {
    let s = start();
    s = playRound(s, true, true);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('question');
    expect(goals(s.playerShots)).toBe(1);
    expect(goals(s.aiShots)).toBe(1);
  });

  it('early end: 3-0 with 2 AI shots remaining decides the game', () => {
    let s = start();
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, true, false);   // 2-0
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });  // 3-...
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: false });     // 3-0, IA con 2 restantes
    expect(s.winner).toBe('player');                              // 0 + 2 < 3
    expect(s.phase).toBe('ai-feedback');                          // feedback del tiro decisivo
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('no early end while the difference is still reachable (3-1, 2 remaining)', () => {
    let s = start();
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, true, true);    // 2-1
    s = playRound(s, true, false);   // 3-1 con 2 restantes de IA → 1+2 >= 3, sigue
    expect(s.winner).toBeNull();
    expect(s.round).toBe(4);
  });

  it("a decisive PLAYER shot ends it without an AI shot", () => {
    let s = start();
    s = playRound(s, false, false);  // 0-0
    s = playRound(s, true, false);   // 1-0
    s = playRound(s, false, true);   // 1-1
    s = playRound(s, true, false);   // 2-1
    // Ronda 5: el jugador anota → 3-1 con 1 tiro restante de IA → 1+1 < 3: decidido
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.winner).toBe('player');
    expect(s.phase).toBe('player-feedback');
    // La IA ya no tira: AI_SHOT se ignora
    const after = shootoutReducer(s, { type: 'AI_SHOT', goal: true });
    expect(after.aiShots).toHaveLength(4);
    // NEXT_ROUND desde player-feedback con winner → gameover
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('AI can win by early end too', () => {
    let s = start();
    s = playRound(s, false, true);   // 0-1
    s = playRound(s, false, true);   // 0-2
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: false }); // 0-... jugador 3 tiros, 2 restantes
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: true });      // 0-3 → 0+2 < 3
    expect(s.winner).toBe('ai');
  });

  it('a 5-5 tie (all goals) enters sudden death', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);
    expect(s.winner).toBeNull();
    expect(s.round).toBe(6);
    expect(s.suddenDeath).toBe(true);
    expect(s.phase).toBe('question');
  });

  it('sudden death: decided only after the AI completes the round', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);  // 5-5 → MS
    // Ronda 6: jugador anota — aún sin decisión (la IA no ha tirado)
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: true });
    expect(s.winner).toBeNull();
    // La IA falla → decidido
    s = shootoutReducer(s, { type: 'AI_SHOT', goal: false });
    expect(s.winner).toBe('player');
    s = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameover');
  });

  it('sudden death continues while tied', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = playRound(s, true, true);  // 5-5
    s = playRound(s, false, false);                            // ambos fallan → sigue
    expect(s.winner).toBeNull();
    expect(s.round).toBe(7);
    expect(s.suddenDeath).toBe(true);
  });

  it('NEXT_ROUND without winner from player-feedback is ignored (AI must shoot)', () => {
    let s = start();
    s = shootoutReducer(s, { type: 'PLAYER_SHOT', goal: false });
    const same = shootoutReducer(s, { type: 'NEXT_ROUND' });
    expect(same).toBe(s);
  });

  it('goals counts converted shots', () => {
    expect(goals([true, false, true, true])).toBe(3);
    expect(goals([])).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/penales/shootout.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `lib/penales/shootout.ts`**

```ts
// Máquina de estados pura de una tanda de penales al mejor de 5 contra la IA.
// El jugador siempre tira primero en cada ronda. No genera preguntas ni usa RNG:
// el hook contenedor inyecta el resultado de cada tiro.

export type ShootoutPhase = 'idle' | 'question' | 'player-feedback' | 'ai-feedback' | 'gameover';
export type Winner = 'player' | 'ai' | null;

export const REGULAR_SHOTS = 5;

export interface ShootoutState {
  phase: ShootoutPhase;
  round: number;                 // 1-based; > REGULAR_SHOTS = muerte súbita
  playerShots: boolean[];        // resultado de cada tiro del jugador
  aiShots: boolean[];            // resultado de cada tiro de la IA
  suddenDeath: boolean;
  winner: Winner;
}

export type ShootoutAction =
  | { type: 'START' }
  | { type: 'PLAYER_SHOT'; goal: boolean }
  | { type: 'AI_SHOT'; goal: boolean }
  | { type: 'NEXT_ROUND' };

export const initialShootoutState: ShootoutState = {
  phase: 'idle',
  round: 1,
  playerShots: [],
  aiShots: [],
  suddenDeath: false,
  winner: null,
};

export function goals(shots: boolean[]): number {
  return shots.filter(Boolean).length;
}

// Regla de decisión, evaluada tras cada tiro.
function decide(playerShots: boolean[], aiShots: boolean[]): Winner {
  const pg = goals(playerShots);
  const ag = goals(aiShots);
  if (playerShots.length <= REGULAR_SHOTS && aiShots.length <= REGULAR_SHOTS) {
    // Fase regular: gana quien tenga una ventaja insalvable con los tiros restantes.
    const pRem = REGULAR_SHOTS - playerShots.length;
    const aRem = REGULAR_SHOTS - aiShots.length;
    if (pg > ag + aRem) return 'player';
    if (ag > pg + pRem) return 'ai';
    return null;
  }
  // Muerte súbita: decide solo con el mismo número de tiros por lado.
  if (playerShots.length === aiShots.length && pg !== ag) return pg > ag ? 'player' : 'ai';
  return null;
}

export function shootoutReducer(state: ShootoutState, action: ShootoutAction): ShootoutState {
  switch (action.type) {
    case 'START':
      return { ...initialShootoutState, phase: 'question' };

    case 'PLAYER_SHOT': {
      if (state.phase !== 'question') return state;
      const playerShots = [...state.playerShots, action.goal];
      return { ...state, playerShots, winner: decide(playerShots, state.aiShots), phase: 'player-feedback' };
    }

    case 'AI_SHOT': {
      // Ignorado si ya está decidido (el tiro del jugador cerró la tanda).
      if (state.phase !== 'player-feedback' || state.winner !== null) return state;
      const aiShots = [...state.aiShots, action.goal];
      return { ...state, aiShots, winner: decide(state.playerShots, aiShots), phase: 'ai-feedback' };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'player-feedback' && state.phase !== 'ai-feedback') return state;
      // Con ganador fijado, cualquier feedback avanza al final (deja animar el tiro decisivo).
      if (state.winner !== null) return { ...state, phase: 'gameover' };
      // Sin ganador, desde player-feedback falta el tiro de la IA: ignorar.
      if (state.phase === 'player-feedback') return state;
      const round = state.round + 1;
      return { ...state, round, suddenDeath: round > REGULAR_SHOTS, phase: 'question' };
    }

    default:
      return state;
  }
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/penales/shootout.test.ts`
Expected: PASS — los 12 casos.

- [ ] **Step 5: Commit**

```bash
git add lib/penales/shootout.ts lib/penales/shootout.test.ts
git commit -m "feat: add penalty shootout state machine"
```

---

## Task 7: Persistencia del récord de penales

**Files:**
- Modify: `lib/storage/localStore.ts`
- Modify: `lib/storage/localStore.test.ts`

- [ ] **Step 1: Añadir los tests**

En `lib/storage/localStore.test.ts`, actualizar el import para incluir `recordPenales`:
```ts
import {
  loadData, saveData, recordGame, addSeenIds, defaultSaveData, recordPenales, type StorageLike,
} from '@/lib/storage/localStore';
```

Y añadir al final del `describe('localStore', ...)`:
```ts
  it('recordPenales accumulates wins and losses per level', () => {
    const s = fakeStorage();
    recordPenales('normal', true, s);
    recordPenales('normal', true, s);
    recordPenales('normal', false, s);
    recordPenales('dificil', false, s);
    const data = loadData(s);
    expect(data.penales.normal).toEqual({ ganados: 2, perdidos: 1 });
    expect(data.penales.dificil).toEqual({ ganados: 0, perdidos: 1 });
    expect(data.penales.facil).toBeUndefined();
  });

  it('old saved data without penales loads with an empty record', () => {
    const s = fakeStorage();
    s.setItem('mundialquiz:v1', JSON.stringify({ totalPoints: 10 }));
    const data = loadData(s);
    expect(data.penales).toEqual({});
    expect(data.totalPoints).toBe(10);
  });
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/storage/localStore.test.ts`
Expected: FAIL — `recordPenales` no existe.

- [ ] **Step 3: Implementar en `lib/storage/localStore.ts`**

En `interface SaveData`, añadir tras `stats: Stats;`:
```ts
  // Récord de Penales por nivel ('facil' | 'normal' | 'dificil').
  penales: Record<string, { ganados: number; perdidos: number }>;
```

En `defaultSaveData()`, añadir al objeto retornado:
```ts
    penales: {},
```

En `loadData`, reemplazar la línea del `return` del `try` por (añade el merge de `penales`):
```ts
    return {
      ...defaultSaveData(),
      ...parsed,
      stats: { ...defaultSaveData().stats, ...parsed.stats },
      penales: parsed.penales ?? {},
    };
```

Y al final del archivo, añadir:
```ts
export function recordPenales(nivel: string, won: boolean, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const current = data.penales[nivel] ?? { ganados: 0, perdidos: 0 };
  const next: SaveData = {
    ...data,
    penales: {
      ...data.penales,
      [nivel]: {
        ganados: current.ganados + (won ? 1 : 0),
        perdidos: current.perdidos + (won ? 0 : 1),
      },
    },
  };
  saveData(next, storage);
  return next;
}
```

- [ ] **Step 4: Ejecutar la suite completa**

Run: `npm test`
Expected: PASS — todo verde (los tests viejos de localStore siguen pasando: `defaultSaveData()` ahora incluye `penales: {}` y las comparaciones `toEqual` lo absorben porque comparan contra `defaultSaveData()`).

- [ ] **Step 5: Commit**

```bash
git add lib/storage/localStore.ts lib/storage/localStore.test.ts
git commit -m "feat: persist penalty shootout record per level"
```

---

## Task 8: Hook `usePenales`

**Files:**
- Create: `hooks/usePenales.ts`

> Tarea de integración UI: se verifica con `npm run build` (la lógica que envuelve ya está testeada).

- [ ] **Step 1: Crear `hooks/usePenales.ts`**

```tsx
"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TOURNAMENTS } from "@/lib/data";
import { createRng, type Rng } from "@/lib/engine/rng";
import { generateQuestion } from "@/lib/engine/generateQuestion";
import { numericCloseness } from "@/lib/engine/scoring";
import { shootoutReducer, initialShootoutState, goals, REGULAR_SHOTS } from "@/lib/penales/shootout";
import { aiShoots, questionDifficulty, type Nivel } from "@/lib/penales/ai";
import { loadData, addSeenIds, recordPenales } from "@/lib/storage/localStore";
import type { Question } from "@/lib/data/types";

// Orquesta la tanda: preguntas del pool completo (dificultad según nivel de IA),
// tiros de la IA probabilísticos y persistencia del récord al terminar.
export function usePenales(nivel: Nivel, seed: number) {
  const rngRef = useRef<Rng>(createRng(seed));
  const seenRef = useRef<string[]>(loadData().seenIds);
  const newSeenRef = useRef<string[]>([]);
  const [state, dispatch] = useReducer(shootoutReducer, initialShootoutState);
  const [question, setQuestion] = useState<Question | null>(null);
  const [lastPlayerGoal, setLastPlayerGoal] = useState<boolean | null>(null);
  const [lastAiGoal, setLastAiGoal] = useState<boolean | null>(null);
  const savedRef = useRef(false);

  const pickQuestion = useCallback(
    (suddenDeath: boolean): Question => {
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: questionDifficulty(nivel, suddenDeath, rngRef.current),
        tournamentFilter: "all",
        seenIds: [...seenRef.current, ...newSeenRef.current],
        rng: rngRef.current,
      });
      newSeenRef.current.push(q.id);
      return q;
    },
    [nivel],
  );

  // Arranque: una sola vez.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dispatch({ type: "START" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- primera pregunta del cliente (RNG sembrado post-mount)
    setQuestion(pickQuestion(false));
  }, [pickQuestion]);

  // Tiro del jugador: responde la pregunta.
  const answer = useCallback(
    (raw: number) => {
      if (state.phase !== "question" || !question) return;
      const goal =
        question.format === "number"
          ? numericCloseness(raw, question.numericAnswer!, question.tolerance!) > 0
          : raw === question.answerIndex;
      setLastPlayerGoal(goal);
      dispatch({ type: "PLAYER_SHOT", goal });
    },
    [question, state.phase],
  );

  // Tiro de la IA (tras el feedback del jugador). Si ya está decidido, cierra.
  const aiShot = useCallback(() => {
    if (state.phase !== "player-feedback") return;
    if (state.winner !== null) {
      dispatch({ type: "NEXT_ROUND" });
      return;
    }
    const goal = aiShoots(nivel, rngRef.current);
    setLastAiGoal(goal);
    dispatch({ type: "AI_SHOT", goal });
  }, [nivel, state.phase, state.winner]);

  // Avanza de ronda (o al resultado si ya hay ganador).
  const nextRound = useCallback(() => {
    if (state.winner !== null) {
      dispatch({ type: "NEXT_ROUND" });
      return;
    }
    setQuestion(pickQuestion(state.round + 1 > REGULAR_SHOTS));
    setLastPlayerGoal(null);
    setLastAiGoal(null);
    dispatch({ type: "NEXT_ROUND" });
  }, [pickQuestion, state.round, state.winner]);

  // Persistencia al terminar.
  useEffect(() => {
    if (state.phase !== "gameover" || savedRef.current || state.winner === null) return;
    savedRef.current = true;
    recordPenales(nivel, state.winner === "player");
    addSeenIds(newSeenRef.current);
  }, [nivel, state.phase, state.winner]);

  return {
    state,
    question,
    lastPlayerGoal,
    lastAiGoal,
    answer,
    aiShot,
    nextRound,
    playerGoals: goals(state.playerShots),
    aiGoals: goals(state.aiShots),
  };
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: éxito, TypeScript limpio.

- [ ] **Step 3: Commit**

```bash
git add hooks/usePenales.ts
git commit -m "feat: add usePenales hook"
```

---

## Task 9: Marcador de la tanda

**Files:**
- Create: `components/penales/Marcador.tsx`

- [ ] **Step 1: Crear `components/penales/Marcador.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

function Dots({ shots, total, label }: { shots: boolean[]; total: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-xs font-black uppercase text-white/70">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const shot = shots[i]; // undefined = pendiente
          return (
            <motion.span
              key={i}
              initial={false}
              animate={shots.length - 1 === i ? { scale: [1.4, 1] } : { scale: 1 }}
              className="grid h-7 w-7 place-items-center rounded-full text-sm font-black text-white"
              style={{
                backgroundColor:
                  shot === undefined
                    ? "rgba(255,255,255,0.12)"
                    : shot
                      ? "var(--color-green)"
                      : "var(--color-red)",
              }}
            >
              {shot === undefined ? "" : shot ? "⚽" : "✕"}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

// Tablero de la tanda: una fila por lado; en muerte súbita crecen los círculos.
export function Marcador({
  playerShots,
  aiShots,
  suddenDeath,
  round,
}: {
  playerShots: boolean[];
  aiShots: boolean[];
  suddenDeath: boolean;
  round: number;
}) {
  const total = Math.max(5, round);
  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-2xl bg-[var(--color-navy)] p-4 ring-1 ring-white/10">
      {suddenDeath && (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-center text-xs font-black uppercase tracking-widest text-[var(--color-red)]"
        >
          ⚡ Muerte súbita
        </motion.p>
      )}
      <Dots shots={playerShots} total={total} label="Tú" />
      <Dots shots={aiShots} total={total} label="IA" />
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: éxito.

- [ ] **Step 3: Commit**

```bash
git add components/penales/Marcador.tsx
git commit -m "feat: add penalty shootout scoreboard"
```

---

## Task 10: Página `/penales`

**Files:**
- Create: `app/penales/page.tsx`

- [ ] **Step 1: Crear `app/penales/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Marcador } from "@/components/penales/Marcador";
import { MultipleChoice } from "@/components/formats/MultipleChoice";
import { TrueFalse } from "@/components/formats/TrueFalse";
import { OddOneOut } from "@/components/formats/OddOneOut";
import { NumberInput } from "@/components/formats/NumberInput";
import { usePenales } from "@/hooks/usePenales";
import { AI_GOAL_PROBABILITY, NIVELES, NIVEL_LABEL, type Nivel } from "@/lib/penales/ai";
import { loadData } from "@/lib/storage/localStore";

export default function PenalesPage() {
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [gameKey, setGameKey] = useState(0);

  // Semilla solo-cliente (post-mount) para evitar mismatch de hidratación.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semilla solo-cliente intencional
    setSeed(Date.now() >>> 0);
  }, []);

  const replay = () => {
    setSeed(Date.now() >>> 0);
    setGameKey((k) => k + 1);
  };

  if (!nivel) {
    return <LevelSelect mounted={seed !== null} onPick={setNivel} />;
  }
  if (seed === null) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }
  return (
    <PenalesGame
      key={gameKey}
      nivel={nivel}
      seed={seed}
      onReplay={replay}
      onChangeLevel={() => setNivel(null)}
    />
  );
}

function LevelSelect({ mounted, onPick }: { mounted: boolean; onPick: (n: Nivel) => void }) {
  // El récord se lee solo tras montar (localStorage no existe en SSR).
  const record = mounted ? loadData().penales : {};
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <MemphisBackground />
      <h1 className="text-center text-3xl font-black uppercase italic">⚽ Penales Quiz</h1>
      <p className="max-w-md text-center text-sm text-[var(--color-gray-light)]/80">
        Cada pregunta es un penal: acierta y es gol, falla y lo ataja el portero. Gana la tanda al
        mejor de 5 contra la IA. Empate = muerte súbita.
      </p>
      <div className="grid w-full max-w-md gap-3">
        {NIVELES.map((n) => {
          const r = record[n];
          return (
            <motion.button
              key={n}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(n)}
              className="flex items-center justify-between rounded-2xl bg-[var(--color-navy)] px-5 py-4 text-left shadow-lg ring-1 ring-white/10"
            >
              <span>
                <span className="block text-lg font-black">{NIVEL_LABEL[n]}</span>
                <span className="text-xs text-[var(--color-gray-light)]/70">
                  La IA anota el {Math.round(AI_GOAL_PROBABILITY[n] * 100)}% de sus penales
                </span>
              </span>
              <span className="text-xs font-bold text-[var(--color-gray-light)]/70">
                {r ? `${r.ganados}G · ${r.perdidos}P` : "—"}
              </span>
            </motion.button>
          );
        })}
      </div>
      <Link href="/" className="text-sm text-white/60 underline">
        Volver al inicio
      </Link>
    </main>
  );
}

function PenalesGame({
  nivel,
  seed,
  onReplay,
  onChangeLevel,
}: {
  nivel: Nivel;
  seed: number;
  onReplay: () => void;
  onChangeLevel: () => void;
}) {
  const { state, question, lastPlayerGoal, lastAiGoal, answer, aiShot, nextRound, playerGoals, aiGoals } =
    usePenales(nivel, seed);

  if (state.phase === "gameover") {
    const won = state.winner === "player";
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        {won && <Confetti pieces={36} />}
        <h1 className="text-3xl font-black uppercase italic">
          {won ? "¡Ganaste la tanda! 🏆" : "La IA ganó esta vez… 🧤"}
        </h1>
        <p className="text-6xl font-black">
          <span style={{ color: "var(--color-green)" }}>{playerGoals}</span>
          <span className="text-white/40"> - </span>
          <span style={{ color: won ? "var(--color-gray-light)" : "var(--color-red)" }}>{aiGoals}</span>
        </p>
        <Marcador
          playerShots={state.playerShots}
          aiShots={state.aiShots}
          suddenDeath={state.suddenDeath}
          round={state.round}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={onReplay}>
            Jugar de nuevo
          </Button>
          <Button variant="ghost" onClick={onChangeLevel}>
            Cambiar nivel
          </Button>
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando penal…</p>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
      <Marcador
        playerShots={state.playerShots}
        aiShots={state.aiShots}
        suddenDeath={state.suddenDeath}
        round={state.round}
      />

      <div className="relative w-full max-w-xl rounded-3xl bg-[var(--color-navy)] p-6 shadow-2xl ring-1 ring-white/10">
        <span className="mb-3 inline-block rounded-full bg-[var(--color-green)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--color-navy-deep)]">
          {state.suddenDeath ? "⚡ Muerte súbita" : `Penal ${state.round} de 5`} · {NIVEL_LABEL[nivel]}
        </span>

        <h2 className="mb-5 text-xl font-black leading-tight sm:text-2xl">{question.prompt}</h2>

        {state.phase === "question" && (
          <>
            {question.format === "multiple-choice" && (
              <MultipleChoice question={question} onAnswer={answer} />
            )}
            {question.format === "odd-one-out" && <OddOneOut question={question} onAnswer={answer} />}
            {question.format === "true-false" && <TrueFalse question={question} onAnswer={answer} />}
            {question.format === "number" && <NumberInput question={question} onAnswer={answer} />}
          </>
        )}

        {state.phase === "player-feedback" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white/10 p-4 text-center"
          >
            {lastPlayerGoal && <Confetti pieces={18} />}
            <p
              className="text-3xl font-black uppercase italic"
              style={{ color: lastPlayerGoal ? "var(--color-green)" : "var(--color-red)" }}
            >
              {lastPlayerGoal ? "⚽ ¡GOOOL!" : "🧤 ¡Atajado!"}
            </p>
            <p className="mt-2 text-sm text-white/80">{question.explanation}</p>
            <div className="mt-4">
              <Button variant="accent" onClick={aiShot}>
                {state.winner !== null ? "Ver resultado" : "Tira la IA →"}
              </Button>
            </div>
          </motion.div>
        )}

        {state.phase === "ai-feedback" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white/10 p-4 text-center"
          >
            <p
              className="text-3xl font-black uppercase italic"
              style={{ color: lastAiGoal ? "var(--color-red)" : "var(--color-green)" }}
            >
              {lastAiGoal ? "La IA anotó ⚽" : "¡La IA falló! 🧤"}
            </p>
            <div className="mt-4">
              <Button variant="accent" onClick={nextRound}>
                {state.winner !== null ? "Ver resultado" : "Siguiente penal →"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
```

> Nota: las variantes actuales de `Button` son `"primary" | "accent" | "ghost"` (verificado en `components/ui/Button.tsx` — la antigua `gold` ya no existe); por eso los botones de acción usan `accent`.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: éxito; aparece la ruta `○ /penales` (estática).

- [ ] **Step 3: Verificación manual**

Run: `npm run dev` → abre `http://localhost:3000/penales` (si el 3000 está ocupado, Next usará otro puerto; míralo en la salida):
- Selector de 3 niveles con récord "—".
- Elige Normal: aparece el marcador (5+5 círculos vacíos) y la pregunta 1.
- Acierta/falla: feedback ⚽/🧤 → "Tira la IA" → resultado IA → "Siguiente penal".
- Termina una tanda: pantalla de resultado con marcador, confeti si ganas, y al volver al selector el récord del nivel actualizado.
Detén el server tras comprobar.

- [ ] **Step 4: Commit**

```bash
git add app/penales
git commit -m "feat: add penalty shootout game page"
```

---

## Task 11: Tarjeta de Penales en el hub

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Añadir el visual y la tarjeta**

En `app/page.tsx`:

(a) Junto a los demás mini-visuales (tras `QuienEsMini`), añadir:
```tsx
// Penales: fila de tiros (gol/fallo/pendiente) + portería.
function PenalesMini() {
  const shots: (boolean | undefined)[] = [true, true, false, true, undefined];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1">
        {shots.map((g, i) => (
          <span
            key={i}
            className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-black text-white"
            style={{
              backgroundColor:
                g === undefined ? "rgba(255,255,255,0.15)" : g ? "var(--color-green)" : "var(--color-red)",
            }}
          >
            {g === undefined ? "" : g ? "⚽" : "✕"}
          </span>
        ))}
      </div>
      <span className="text-2xl">🥅</span>
    </div>
  );
}
```

(b) Dentro del grid de tarjetas, tras la `GameCard` de `/quien-es`, añadir:
```tsx
        <GameCard
          href="/penales"
          badge="vs IA"
          accent="var(--color-red)"
          title="Penales Quiz"
          subtitle="Cada pregunta es un penal. Gana la tanda al mejor de 5 contra la IA."
          visual={<PenalesMini />}
        />
```

- [ ] **Step 2: Verificar build y vista**

Run: `npm run build` → éxito.
Run: `npm run dev` → el home muestra 5 tarjetas; la de Penales navega a `/penales`. Verifica también que `/quiz` muestre el modo nuevo "Adivina el País" con su icono de bandera. Detén el server.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add Penales card to the hub"
```

---

## Task 12: Integración final

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: PASS — toda la suite (los tests previos + ai, shootout, playerCountry, generatorIds, modos, localStore).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: éxito; rutas `/` y `/penales` presentes.

- [ ] **Step 4: Repaso manual final**

Run: `npm run dev` y verifica:
- `/quiz` → modo "Adivina el País" funciona (10 preguntas jugador→selección, opciones de la misma confederación).
- Contrarreloj: en una partida larga aparecen preguntas de jugador→país mezcladas.
- `/penales`: tanda completa en cada resultado posible que puedas provocar (ganar, perder); muerte súbita si logras empatar; el récord persiste al recargar.
Detén el server.

- [ ] **Step 5: Commit final (si hubo ajustes)**

```bash
git add -A && git commit -m "chore: final integration pass for penales + adivina-pais"
```

---

## Cobertura del spec (autoverificación)

- **Generadores jugador→país (2.1)** → Tasks 1, 2.
- **Extensión `generatorIds` (2.2)** → Task 3.
- **Modo `adivina-pais` + icono (2.3)** → Task 4.
- **IA por niveles (3.2)** → Task 5.
- **Máquina de estados con final anticipado/muerte súbita (3.3)** → Task 6.
- **Hook `usePenales` (3.4)** → Task 8.
- **Persistencia récord (3.5)** → Task 7.
- **UI: marcador, formatos reutilizados, feedback gol/atajado, resultado (3.6)** → Tasks 9, 10.
- **Hub (3.7)** → Task 11.
- **Testing (4)** → Tasks 2, 3, 4, 5, 6, 7 + Task 12.
- **Riesgos (5):** filtros defensivos y fallbacks en Task 2; sin cambios al motor compartido salvo passthrough (Task 3); icono verificado contra `ModeIcon.tsx` real (Task 4); marca actual JuegaMundial respetada en Tasks 9-11.
