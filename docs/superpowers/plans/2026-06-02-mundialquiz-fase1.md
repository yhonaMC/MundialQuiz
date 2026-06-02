# MundialQuiz — Plan de Implementación (Fase 1 / MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el MVP de MundialQuiz: un motor de quiz que genera preguntas dinámicas desde una base de datos de hechos de los Mundiales 1998–2022, con 6 modos de juego, 4 formatos de pregunta, puntos, dificultad adaptativa, persistencia local y estética "Fiesta Memphis".

**Architecture:** Capas con responsabilidad única: datos (hechos puros) → generadores (funciones puras datos→pregunta) → selector (elige generador, evita repetición) → reducer de sesión (máquina de estados pura) → hook contenedor (efectos: timer, persistencia) → UI (Next.js App Router + Framer Motion). Toda la lógica de juego es pura y se prueba con Vitest sin DOM.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Vitest.

**Referencia del diseño:** `docs/superpowers/specs/2026-06-02-mundialquiz-design.md`

---

## Notas para quien implementa

- **Next.js 16:** lee `node_modules/next/dist/docs/01-app/01-getting-started/` antes de tocar rutas. `params` y `searchParams` son **Promises** (hay que `await`). Las páginas de juego son Client Components (`'use client'`).
- **Alias de imports:** usa `@/lib/...`, `@/components/...` (configurado en `tsconfig.json`, `@/*` → raíz).
- **Idioma:** toda la UI y los nombres de selecciones están en español (p.ej. "Países Bajos", "Alemania").
- **Refinamiento vs spec:** el campo `participants: string[]` del spec (los 32 equipos) se reemplaza por `notableTeams: string[]` (los 8 cuartofinalistas, mucho más fiables de verificar) + se añade `fourth` (4.º puesto). Los distractores de las preguntas salen de un pool global `NATIONAL_TEAMS`. Razón: listar 32 equipos exactos × 7 torneos es propenso a errores; los cuartofinalistas y el top-4 son verificables y suficientes para generar preguntas ricas.
- **Determinismo:** la aleatoriedad usa un RNG sembrado (`createRng`), nunca `Math.random()` en lógica probada, para que los tests sean reproducibles.

## Mapa de archivos

```
vitest.config.mts                      # config de tests (alias @, entorno node)
app/
  layout.tsx                           # MODIFICAR: metadata + fondo de marca
  globals.css                          # MODIFICAR: paleta Fiesta Memphis (@theme)
  page.tsx                             # MODIFICAR: home / selección de modo
  play/[mode]/page.tsx                 # CREAR: pantalla de juego
lib/
  data/
    types.ts                           # tipos Tournament, NotableMatch, Question, QuestionFormat
    teams.ts                           # NATIONAL_TEAMS (pool de distractores)
    tournaments/1998.ts ... 2022.ts    # 7 archivos de hechos
    index.ts                           # TOURNAMENTS agregado + getTournament
  engine/
    rng.ts                             # RNG sembrado (createRng, hashSeed)
    questionGenerators/index.ts        # los 10 generadores + tipo Generator
    generateQuestion.ts                # selector + no-repetición
    scoring.ts                         # scoreAnswer, numericCloseness
    difficulty.ts                      # nextDifficulty
    gameSession.ts                     # reducer (máquina de estados) + estado inicial
  modes/
    modes.ts                           # las 6 GameMode + getMode
  storage/
    localStore.ts                      # persistencia localStorage
components/
  ui/MemphisBackground.tsx             # fondo geométrico decorativo
  ui/Button.tsx                        # botón de marca
  ui/Confetti.tsx                      # confeti con paleta de marca
  ModeCard.tsx                         # tarjeta de modo (home)
  Hud.tsx                              # puntos / reloj / vidas / racha
  QuestionCard.tsx                     # orquesta formato + feedback + animación
  formats/MultipleChoice.tsx
  formats/TrueFalse.tsx
  formats/NumberInput.tsx
  formats/OddOneOut.tsx
hooks/
  useGameSession.ts                    # une reducer + selector + timer + persistencia
```

---

## Task 1: Configurar Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mts`
- Create: `lib/engine/__smoke__.test.ts` (temporal, se borra al final del task)

- [ ] **Step 1: Instalar Vitest**

Run:
```bash
npm install -D vitest
```
Expected: se añade `vitest` a `devDependencies` sin errores.

- [ ] **Step 2: Crear la config de Vitest**

Create `vitest.config.mts`:
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Añadir scripts de test a `package.json`**

En `package.json`, dentro de `"scripts"`, añade:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Crear un test de humo para verificar el arnés**

Create `lib/engine/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Ejecutar los tests**

Run: `npm test`
Expected: PASS, 1 test pasando.

- [ ] **Step 6: Borrar el test de humo y commitear**

```bash
rm lib/engine/__smoke__.test.ts
git add package.json package-lock.json vitest.config.mts
git commit -m "chore: set up Vitest test harness"
```

---

## Task 2: Tipos de datos

**Files:**
- Create: `lib/data/types.ts`
- Test: `lib/data/types.test.ts`

- [ ] **Step 1: Escribir el test que valida la forma de los tipos**

Create `lib/data/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { Tournament, Question, QuestionFormat } from '@/lib/data/types';

describe('types', () => {
  it('a Tournament object satisfies the interface', () => {
    const t: Tournament = {
      year: 2010,
      hosts: ['Sudáfrica'],
      champion: 'España',
      runnerUp: 'Países Bajos',
      third: 'Alemania',
      fourth: 'Uruguay',
      finalScore: '1-0 (pr)',
      finalVenue: 'Soccer City, Johannesburgo',
      goldenBoot: { player: 'Thomas Müller', goals: 5 },
      goldenBall: 'Diego Forlán',
      mascot: 'Zakumi',
      numTeams: 32,
      totalGoals: 145,
      notableTeams: ['España', 'Países Bajos', 'Alemania', 'Uruguay'],
      notableMatches: [
        { stage: 'Final', teamA: 'España', teamB: 'Países Bajos', score: '1-0 (pr)' },
      ],
    };
    expect(t.year).toBe(2010);
  });

  it('a Question object satisfies the interface', () => {
    const formats: QuestionFormat[] = ['multiple-choice', 'true-false', 'number', 'odd-one-out'];
    const q: Question = {
      id: 'champion:2010',
      format: 'multiple-choice',
      prompt: '¿Quién ganó el Mundial 2010?',
      options: ['España', 'Países Bajos', 'Alemania', 'Brasil'],
      answerIndex: 0,
      difficulty: 1,
      tournamentYear: 2010,
      explanation: 'España ganó su primer Mundial en 2010.',
      tags: ['campeón'],
    };
    expect(formats).toContain(q.format);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run: `npx vitest run lib/data/types.test.ts`
Expected: FAIL — no existe el módulo `@/lib/data/types`.

- [ ] **Step 3: Crear los tipos**

Create `lib/data/types.ts`:
```ts
export type QuestionFormat =
  | 'multiple-choice'
  | 'true-false'
  | 'number'
  | 'odd-one-out';

export interface NotableMatch {
  stage: string;        // "Final", "Semifinal", "Cuartos de final", ...
  teamA: string;
  teamB: string;
  score: string;        // p.ej. "1-0", "3-3 (4-2 pen)"
  note?: string;        // dato curioso opcional
}

export interface Tournament {
  year: number;                 // 1998..2022
  hosts: string[];              // país(es) sede
  champion: string;
  runnerUp: string;
  third: string;
  fourth: string;
  finalScore: string;           // p.ej. "1-0 (pr)" = prórroga; "3-3 (4-2 pen)"
  finalVenue: string;
  goldenBoot: { player: string; goals: number };
  goldenBall: string;
  mascot: string;
  numTeams: number;
  totalGoals: number;
  notableTeams: string[];       // los 8 cuartofinalistas
  notableMatches: NotableMatch[];
}

export interface Question {
  id: string;                   // determinista; usado para no repetir
  format: QuestionFormat;
  prompt: string;
  options?: string[];           // multiple-choice / true-false / odd-one-out
  answerIndex?: number;         // índice de la opción correcta
  numericAnswer?: number;       // number
  tolerance?: number;           // number: margen para puntaje parcial
  difficulty: number;           // 1..5
  tournamentYear?: number;
  explanation: string;
  tags: string[];
}
```

- [ ] **Step 4: Ejecutar el test para verlo pasar**

Run: `npx vitest run lib/data/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data/types.ts lib/data/types.test.ts
git commit -m "feat: add core data and question types"
```

---

## Task 3: Pool de selecciones (distractores)

**Files:**
- Create: `lib/data/teams.ts`
- Test: `lib/data/teams.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/data/teams.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { NATIONAL_TEAMS } from '@/lib/data/teams';

describe('NATIONAL_TEAMS', () => {
  it('has a healthy pool of unique team names', () => {
    expect(NATIONAL_TEAMS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(NATIONAL_TEAMS).size).toBe(NATIONAL_TEAMS.length);
  });

  it('includes the major champions', () => {
    for (const t of ['Brasil', 'Alemania', 'Argentina', 'Francia', 'España', 'Italia']) {
      expect(NATIONAL_TEAMS).toContain(t);
    }
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/data/teams.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Crear el pool**

Create `lib/data/teams.ts`:
```ts
// Pool de selecciones para generar distractores en las preguntas.
// Nombres en español, sin duplicados.
export const NATIONAL_TEAMS: string[] = [
  'Brasil',
  'Alemania',
  'Argentina',
  'Francia',
  'España',
  'Italia',
  'Países Bajos',
  'Inglaterra',
  'Portugal',
  'Bélgica',
  'Croacia',
  'Uruguay',
  'México',
  'Colombia',
  'Chile',
  'Estados Unidos',
  'Corea del Sur',
  'Japón',
  'Nigeria',
  'Camerún',
  'Senegal',
  'Ghana',
  'Marruecos',
  'Suecia',
  'Dinamarca',
  'Suiza',
  'Polonia',
  'Turquía',
  'Paraguay',
  'Costa Rica',
  'Rusia',
  'Ucrania',
];
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/data/teams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data/teams.ts lib/data/teams.test.ts
git commit -m "feat: add national teams pool for distractors"
```

---

## Task 4: RNG sembrado

**Files:**
- Create: `lib/engine/rng.ts`
- Test: `lib/engine/rng.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createRng, hashSeed } from '@/lib/engine/rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('next() returns values in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns an integer in [0, n)', () => {
    const r = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = r.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick returns an element of the array', () => {
    const r = createRng(1);
    const arr = ['a', 'b', 'c'];
    expect(arr).toContain(r.pick(arr));
  });

  it('sample returns n unique elements', () => {
    const r = createRng(2);
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const out = r.sample(arr, 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    for (const x of out) expect(arr).toContain(x);
  });

  it('shuffle keeps the same elements', () => {
    const r = createRng(9);
    const arr = [1, 2, 3, 4, 5];
    const out = r.shuffle(arr);
    expect([...out].sort()).toEqual([...arr].sort());
  });

  it('hashSeed maps strings to stable numbers', () => {
    expect(hashSeed('2026-06-02')).toBe(hashSeed('2026-06-02'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/rng.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el RNG**

Create `lib/engine/rng.ts`:
```ts
export interface Rng {
  next(): number;            // [0, 1)
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  sample<T>(arr: readonly T[], n: number): T[];
  shuffle<T>(arr: readonly T[]): T[];
}

// mulberry32: PRNG pequeño y determinista.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const rng: Rng = {
    next,
    int(maxExclusive: number) {
      return Math.floor(next() * maxExclusive);
    },
    pick<T>(arr: readonly T[]): T {
      return arr[rng.int(arr.length)];
    },
    shuffle<T>(arr: readonly T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    sample<T>(arr: readonly T[], n: number): T[] {
      return rng.shuffle(arr).slice(0, n);
    },
  };
  return rng;
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/rng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/rng.ts lib/engine/rng.test.ts
git commit -m "feat: add seeded RNG utilities"
```

---

## Task 5: Datos de los 7 mundiales + agregador

**Files:**
- Create: `lib/data/tournaments/1998.ts` … `2022.ts` (7 archivos)
- Create: `lib/data/index.ts`
- Test: `lib/data/index.test.ts`

> **Verificación de datos (obligatoria):** antes de cerrar este task, contrasta cada archivo con una fuente fiable (Wikipedia/FIFA). Los hechos provistos abajo son correctos a mi conocimiento, pero `totalGoals` y nombres exactos deben confirmarse. El test de invariantes detecta inconsistencias estructurales, no errores factuales.

- [ ] **Step 1: Escribir el test de invariantes**

Create `lib/data/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TOURNAMENTS, getTournament } from '@/lib/data';

describe('TOURNAMENTS dataset', () => {
  it('contains exactly the 7 editions 1998–2022', () => {
    expect(TOURNAMENTS.map((t) => t.year)).toEqual([
      1998, 2002, 2006, 2010, 2014, 2018, 2022,
    ]);
  });

  it.each(
    [1998, 2002, 2006, 2010, 2014, 2018, 2022].map((y) => [y] as const),
  )('tournament %i has valid invariants', (year) => {
    const t = getTournament(year)!;
    expect(t).toBeDefined();
    // Los 4 primeros puestos son selecciones distintas
    const top4 = [t.champion, t.runnerUp, t.third, t.fourth];
    expect(new Set(top4).size).toBe(4);
    // notableTeams incluye al top-4 y son 8 cuartofinalistas únicos
    expect(t.notableTeams).toHaveLength(8);
    expect(new Set(t.notableTeams).size).toBe(8);
    for (const team of top4) expect(t.notableTeams).toContain(team);
    // Campos numéricos coherentes
    expect(t.numTeams).toBe(32);
    expect(t.totalGoals).toBeGreaterThan(100);
    expect(t.goldenBoot.goals).toBeGreaterThan(0);
    // Campos de texto presentes
    expect(t.hosts.length).toBeGreaterThan(0);
    expect(t.mascot.length).toBeGreaterThan(0);
    expect(t.finalVenue.length).toBeGreaterThan(0);
    expect(t.notableMatches.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/data/index.test.ts`
Expected: FAIL — módulo `@/lib/data` inexistente.

- [ ] **Step 3: Crear `lib/data/tournaments/1998.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const FRANCIA_1998: Tournament = {
  year: 1998,
  hosts: ['Francia'],
  champion: 'Francia',
  runnerUp: 'Brasil',
  third: 'Croacia',
  fourth: 'Países Bajos',
  finalScore: '3-0',
  finalVenue: 'Stade de France, Saint-Denis',
  goldenBoot: { player: 'Davor Šuker', goals: 6 },
  goldenBall: 'Ronaldo',
  mascot: 'Footix',
  numTeams: 32,
  totalGoals: 171,
  notableTeams: ['Francia', 'Brasil', 'Croacia', 'Países Bajos', 'Italia', 'Alemania', 'Argentina', 'Dinamarca'],
  notableMatches: [
    { stage: 'Final', teamA: 'Francia', teamB: 'Brasil', score: '3-0', note: 'Doblete de Zidane.' },
    { stage: 'Semifinal', teamA: 'Francia', teamB: 'Croacia', score: '2-1', note: 'Doblete de Lilian Thuram.' },
  ],
};
```

- [ ] **Step 4: Crear `lib/data/tournaments/2002.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const COREAJAPON_2002: Tournament = {
  year: 2002,
  hosts: ['Corea del Sur', 'Japón'],
  champion: 'Brasil',
  runnerUp: 'Alemania',
  third: 'Turquía',
  fourth: 'Corea del Sur',
  finalScore: '2-0',
  finalVenue: 'Estadio Internacional de Yokohama',
  goldenBoot: { player: 'Ronaldo', goals: 8 },
  goldenBall: 'Oliver Kahn',
  mascot: 'Ato, Kaz y Nik (The Spheriks)',
  numTeams: 32,
  totalGoals: 161,
  notableTeams: ['Brasil', 'Alemania', 'Turquía', 'Corea del Sur', 'España', 'Inglaterra', 'Estados Unidos', 'Senegal'],
  notableMatches: [
    { stage: 'Final', teamA: 'Brasil', teamB: 'Alemania', score: '2-0', note: 'Doblete de Ronaldo.' },
    { stage: 'Semifinal', teamA: 'Brasil', teamB: 'Turquía', score: '1-0' },
  ],
};
```

- [ ] **Step 5: Crear `lib/data/tournaments/2006.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const ALEMANIA_2006: Tournament = {
  year: 2006,
  hosts: ['Alemania'],
  champion: 'Italia',
  runnerUp: 'Francia',
  third: 'Alemania',
  fourth: 'Portugal',
  finalScore: '1-1 (5-3 pen)',
  finalVenue: 'Olympiastadion, Berlín',
  goldenBoot: { player: 'Miroslav Klose', goals: 5 },
  goldenBall: 'Zinedine Zidane',
  mascot: 'Goleo VI',
  numTeams: 32,
  totalGoals: 147,
  notableTeams: ['Italia', 'Francia', 'Alemania', 'Portugal', 'Brasil', 'Argentina', 'Inglaterra', 'Ucrania'],
  notableMatches: [
    { stage: 'Final', teamA: 'Italia', teamB: 'Francia', score: '1-1 (5-3 pen)', note: 'Cabezazo de Zidane a Materazzi y expulsión.' },
    { stage: 'Semifinal', teamA: 'Italia', teamB: 'Alemania', score: '2-0 (pr)' },
  ],
};
```

- [ ] **Step 6: Crear `lib/data/tournaments/2010.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const SUDAFRICA_2010: Tournament = {
  year: 2010,
  hosts: ['Sudáfrica'],
  champion: 'España',
  runnerUp: 'Países Bajos',
  third: 'Alemania',
  fourth: 'Uruguay',
  finalScore: '1-0 (pr)',
  finalVenue: 'Soccer City, Johannesburgo',
  goldenBoot: { player: 'Thomas Müller', goals: 5 },
  goldenBall: 'Diego Forlán',
  mascot: 'Zakumi',
  numTeams: 32,
  totalGoals: 145,
  notableTeams: ['España', 'Países Bajos', 'Alemania', 'Uruguay', 'Brasil', 'Argentina', 'Ghana', 'Paraguay'],
  notableMatches: [
    { stage: 'Final', teamA: 'España', teamB: 'Países Bajos', score: '1-0 (pr)', note: 'Gol de Andrés Iniesta en la prórroga.' },
    { stage: 'Cuartos de final', teamA: 'Uruguay', teamB: 'Ghana', score: '1-1 (4-2 pen)', note: 'Mano de Luis Suárez en la línea.' },
  ],
};
```

- [ ] **Step 7: Crear `lib/data/tournaments/2014.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const BRASIL_2014: Tournament = {
  year: 2014,
  hosts: ['Brasil'],
  champion: 'Alemania',
  runnerUp: 'Argentina',
  third: 'Países Bajos',
  fourth: 'Brasil',
  finalScore: '1-0 (pr)',
  finalVenue: 'Estadio Maracaná, Río de Janeiro',
  goldenBoot: { player: 'James Rodríguez', goals: 6 },
  goldenBall: 'Lionel Messi',
  mascot: 'Fuleco',
  numTeams: 32,
  totalGoals: 171,
  notableTeams: ['Alemania', 'Argentina', 'Países Bajos', 'Brasil', 'Francia', 'Colombia', 'Bélgica', 'Costa Rica'],
  notableMatches: [
    { stage: 'Final', teamA: 'Alemania', teamB: 'Argentina', score: '1-0 (pr)', note: 'Gol de Mario Götze en la prórroga.' },
    { stage: 'Semifinal', teamA: 'Alemania', teamB: 'Brasil', score: '7-1', note: 'El histórico "Mineirazo".' },
  ],
};
```

- [ ] **Step 8: Crear `lib/data/tournaments/2018.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const RUSIA_2018: Tournament = {
  year: 2018,
  hosts: ['Rusia'],
  champion: 'Francia',
  runnerUp: 'Croacia',
  third: 'Bélgica',
  fourth: 'Inglaterra',
  finalScore: '4-2',
  finalVenue: 'Estadio Luzhnikí, Moscú',
  goldenBoot: { player: 'Harry Kane', goals: 6 },
  goldenBall: 'Luka Modrić',
  mascot: 'Zabivaka',
  numTeams: 32,
  totalGoals: 169,
  notableTeams: ['Francia', 'Croacia', 'Bélgica', 'Inglaterra', 'Uruguay', 'Brasil', 'Rusia', 'Suecia'],
  notableMatches: [
    { stage: 'Final', teamA: 'Francia', teamB: 'Croacia', score: '4-2' },
    { stage: 'Semifinal', teamA: 'Croacia', teamB: 'Inglaterra', score: '2-1 (pr)' },
  ],
};
```

- [ ] **Step 9: Crear `lib/data/tournaments/2022.ts`**

```ts
import type { Tournament } from '@/lib/data/types';

export const CATAR_2022: Tournament = {
  year: 2022,
  hosts: ['Catar'],
  champion: 'Argentina',
  runnerUp: 'Francia',
  third: 'Croacia',
  fourth: 'Marruecos',
  finalScore: '3-3 (4-2 pen)',
  finalVenue: 'Estadio de Lusail',
  goldenBoot: { player: 'Kylian Mbappé', goals: 8 },
  goldenBall: 'Lionel Messi',
  mascot: "La'eeb",
  numTeams: 32,
  totalGoals: 172,
  notableTeams: ['Argentina', 'Francia', 'Croacia', 'Marruecos', 'Brasil', 'Países Bajos', 'Portugal', 'Inglaterra'],
  notableMatches: [
    { stage: 'Final', teamA: 'Argentina', teamB: 'Francia', score: '3-3 (4-2 pen)', note: 'Triplete de Mbappé; Argentina campeón en penales.' },
    { stage: 'Semifinal', teamA: 'Argentina', teamB: 'Croacia', score: '3-0' },
  ],
};
```

- [ ] **Step 10: Crear el agregador `lib/data/index.ts`**

```ts
import type { Tournament } from '@/lib/data/types';
import { FRANCIA_1998 } from '@/lib/data/tournaments/1998';
import { COREAJAPON_2002 } from '@/lib/data/tournaments/2002';
import { ALEMANIA_2006 } from '@/lib/data/tournaments/2006';
import { SUDAFRICA_2010 } from '@/lib/data/tournaments/2010';
import { BRASIL_2014 } from '@/lib/data/tournaments/2014';
import { RUSIA_2018 } from '@/lib/data/tournaments/2018';
import { CATAR_2022 } from '@/lib/data/tournaments/2022';

export const TOURNAMENTS: Tournament[] = [
  FRANCIA_1998,
  COREAJAPON_2002,
  ALEMANIA_2006,
  SUDAFRICA_2010,
  BRASIL_2014,
  RUSIA_2018,
  CATAR_2022,
];

export function getTournament(year: number): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.year === year);
}

export const TOURNAMENT_YEARS = TOURNAMENTS.map((t) => t.year);
```

- [ ] **Step 11: Ejecutar el test para verlo pasar**

Run: `npx vitest run lib/data/index.test.ts`
Expected: PASS, todos los torneos cumplen invariantes.

- [ ] **Step 12: Verificar los datos contra una fuente fiable y commitear**

Revisa rápidamente cada archivo contra Wikipedia (campeón, marcador de final, bota de oro, `totalGoals`). Corrige si hace falta.
```bash
git add lib/data/tournaments lib/data/index.ts lib/data/index.test.ts
git commit -m "feat: add World Cup facts dataset (1998-2022)"
```

---

## Task 6: Generadores de preguntas

**Files:**
- Create: `lib/engine/questionGenerators/index.ts`
- Test: `lib/engine/questionGenerators/index.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/questionGenerators/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GENERATORS } from '@/lib/engine/questionGenerators';
import { TOURNAMENTS, getTournament } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';
import type { Question } from '@/lib/data/types';

function assertValidQuestion(q: Question) {
  expect(q.id.length).toBeGreaterThan(0);
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
  expect(q.difficulty).toBeGreaterThanOrEqual(1);
  expect(q.difficulty).toBeLessThanOrEqual(5);

  if (q.format === 'multiple-choice' || q.format === 'odd-one-out') {
    expect(q.options).toBeDefined();
    expect(q.options!.length).toBe(4);
    expect(new Set(q.options).size).toBe(4); // opciones únicas
    expect(q.answerIndex).toBeGreaterThanOrEqual(0);
    expect(q.answerIndex).toBeLessThan(4);
  }
  if (q.format === 'true-false') {
    expect(q.options).toEqual(['Verdadero', 'Falso']);
    expect([0, 1]).toContain(q.answerIndex);
  }
  if (q.format === 'number') {
    expect(typeof q.numericAnswer).toBe('number');
    expect(q.tolerance).toBeGreaterThan(0);
  }
}

describe('GENERATORS', () => {
  it('every generator produces a valid question for every tournament', () => {
    const rng = createRng(123);
    for (const gen of GENERATORS) {
      for (const t of TOURNAMENTS) {
        const q = gen.build(t, TOURNAMENTS, rng);
        assertValidQuestion(q);
      }
    }
  });

  it('covers all four formats across the generator set', () => {
    const formats = new Set(GENERATORS.flatMap((g) => g.formats));
    expect(formats).toContain('multiple-choice');
    expect(formats).toContain('true-false');
    expect(formats).toContain('number');
    expect(formats).toContain('odd-one-out');
  });

  it('the champion generator marks the correct answer', () => {
    const gen = GENERATORS.find((g) => g.id === 'champion')!;
    const t = getTournament(2010)!;
    const q = gen.build(t, TOURNAMENTS, createRng(5));
    expect(q.options![q.answerIndex!]).toBe('España');
  });

  it('generator ids are unique', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/questionGenerators/index.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar los generadores**

Create `lib/engine/questionGenerators/index.ts`:
```ts
import type { Question, QuestionFormat, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import { NATIONAL_TEAMS } from '@/lib/data/teams';

export interface Generator {
  id: string;
  difficulty: number;          // 1..5
  formats: QuestionFormat[];
  build(t: Tournament, all: Tournament[], rng: Rng): Question;
}

// Helper: arma 4 opciones de opción múltiple con la correcta + 3 distractores únicos.
function makeOptions(correct: string, pool: string[], rng: Rng): { options: string[]; answerIndex: number } {
  const distractors = rng
    .shuffle(pool.filter((x) => x !== correct))
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 3);
  const options = rng.shuffle([correct, ...distractors]);
  return { options, answerIndex: options.indexOf(correct) };
}

const champion: Generator = {
  id: 'champion',
  difficulty: 1,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.champion).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(t.champion, pool, rng);
    return {
      id: `champion:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué selección fue campeona del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 1,
      tournamentYear: t.year,
      explanation: `${t.champion} fue campeón del Mundial ${t.year} (sede: ${t.hosts.join(' y ')}).`,
      tags: ['campeón'],
    };
  },
};

const runnerUp: Generator = {
  id: 'runner-up',
  difficulty: 2,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.flatMap((x) => [x.runnerUp, x.champion]).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(t.runnerUp, pool, rng);
    return {
      id: `runner-up:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué selección fue subcampeona (finalista perdedora) del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 2,
      tournamentYear: t.year,
      explanation: `${t.runnerUp} perdió la final del Mundial ${t.year} ante ${t.champion} (${t.finalScore}).`,
      tags: ['subcampeón', 'final'],
    };
  },
};

const host: Generator = {
  id: 'host',
  difficulty: 2,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const correct = t.hosts[0];
    const pool = all.flatMap((x) => x.hosts).concat(NATIONAL_TEAMS);
    const { options, answerIndex } = makeOptions(correct, pool, rng);
    return {
      id: `host:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Qué país fue (co)sede del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 2,
      tournamentYear: t.year,
      explanation: `El Mundial ${t.year} se jugó en ${t.hosts.join(' y ')}.`,
      tags: ['sede'],
    };
  },
};

const goldenBoot: Generator = {
  id: 'golden-boot',
  difficulty: 3,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const correct = t.goldenBoot.player;
    const pool = all.map((x) => x.goldenBoot.player).concat(all.map((x) => x.goldenBall));
    const { options, answerIndex } = makeOptions(correct, pool, rng);
    return {
      id: `golden-boot:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Quién ganó la Bota de Oro (máximo goleador) del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${correct} fue el máximo goleador del Mundial ${t.year} con ${t.goldenBoot.goals} goles.`,
      tags: ['goleador', 'bota de oro'],
    };
  },
};

const goldenBootGoals: Generator = {
  id: 'golden-boot-goals',
  difficulty: 3,
  formats: ['number'],
  build(t) {
    return {
      id: `golden-boot-goals:${t.year}`,
      format: 'number',
      prompt: `¿Cuántos goles marcó ${t.goldenBoot.player} para ganar la Bota de Oro del Mundial ${t.year}?`,
      numericAnswer: t.goldenBoot.goals,
      tolerance: 2,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${t.goldenBoot.player} marcó ${t.goldenBoot.goals} goles en el Mundial ${t.year}.`,
      tags: ['goleador', 'número'],
    };
  },
};

const mascot: Generator = {
  id: 'mascot',
  difficulty: 4,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.mascot);
    const { options, answerIndex } = makeOptions(t.mascot, pool, rng);
    return {
      id: `mascot:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Cuál fue la mascota oficial del Mundial ${t.year}?`,
      options,
      answerIndex,
      difficulty: 4,
      tournamentYear: t.year,
      explanation: `La mascota del Mundial ${t.year} fue ${t.mascot}.`,
      tags: ['mascota'],
    };
  },
};

const finalScore: Generator = {
  id: 'final-score',
  difficulty: 3,
  formats: ['multiple-choice'],
  build(t, all, rng) {
    const pool = all.map((x) => x.finalScore);
    const { options, answerIndex } = makeOptions(t.finalScore, pool, rng);
    return {
      id: `final-score:${t.year}`,
      format: 'multiple-choice',
      prompt: `¿Cuál fue el marcador de la final del Mundial ${t.year} (${t.champion} vs ${t.runnerUp})?`,
      options,
      answerIndex,
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `La final del Mundial ${t.year} terminó ${t.finalScore} a favor de ${t.champion}.`,
      tags: ['final', 'marcador'],
    };
  },
};

const wasChampion: Generator = {
  id: 'was-champion',
  difficulty: 1,
  formats: ['true-false'],
  build(t, all, rng) {
    // 50% afirmación verdadera, 50% falsa.
    const asksTruth = rng.next() < 0.5;
    const team = asksTruth
      ? t.champion
      : rng.pick(NATIONAL_TEAMS.filter((x) => x !== t.champion));
    const isTrue = team === t.champion;
    return {
      id: `was-champion:${t.year}:${team}`,
      format: 'true-false',
      prompt: `Verdadero o Falso: ${team} fue campeón del Mundial ${t.year}.`,
      options: ['Verdadero', 'Falso'],
      answerIndex: isTrue ? 0 : 1,
      difficulty: 1,
      tournamentYear: t.year,
      explanation: `El campeón del Mundial ${t.year} fue ${t.champion}.`,
      tags: ['campeón', 'verdadero-falso'],
    };
  },
};

const notChampion: Generator = {
  id: 'not-champion',
  difficulty: 3,
  formats: ['odd-one-out'],
  build(t, all, rng) {
    // 3 campeones reales + 1 selección que NO fue campeona en este set.
    const champions = Array.from(new Set(all.map((x) => x.champion)));
    const threeChampions = rng.sample(champions, 3);
    const nonChampion = rng.pick(
      NATIONAL_TEAMS.filter((x) => !champions.includes(x)),
    );
    const options = rng.shuffle([...threeChampions, nonChampion]);
    return {
      id: `not-champion:${nonChampion}:${[...threeChampions].sort().join('-')}`,
      format: 'odd-one-out',
      prompt: 'Tres de estas selecciones fueron campeonas del mundo entre 1998 y 2022. ¿Cuál NO lo fue?',
      options,
      answerIndex: options.indexOf(nonChampion),
      difficulty: 3,
      tournamentYear: t.year,
      explanation: `${nonChampion} no ganó ningún Mundial entre 1998 y 2022. Campeones: ${champions.join(', ')}.`,
      tags: ['campeón', 'descarta'],
    };
  },
};

const totalGoals: Generator = {
  id: 'total-goals',
  difficulty: 5,
  formats: ['number'],
  build(t) {
    return {
      id: `total-goals:${t.year}`,
      format: 'number',
      prompt: `¿Cuántos goles se marcaron en total en el Mundial ${t.year}?`,
      numericAnswer: t.totalGoals,
      tolerance: 15,
      difficulty: 5,
      tournamentYear: t.year,
      explanation: `En el Mundial ${t.year} se marcaron ${t.totalGoals} goles en total.`,
      tags: ['goles', 'número'],
    };
  },
};

export const GENERATORS: Generator[] = [
  champion,
  runnerUp,
  host,
  goldenBoot,
  goldenBootGoals,
  mascot,
  finalScore,
  wasChampion,
  notChampion,
  totalGoals,
];
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/questionGenerators/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/questionGenerators
git commit -m "feat: add question generators for all four formats"
```

---

## Task 7: Selector de preguntas (no-repetición)

**Files:**
- Create: `lib/engine/generateQuestion.ts`
- Test: `lib/engine/generateQuestion.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/generateQuestion.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateQuestion } from '@/lib/engine/generateQuestion';
import { TOURNAMENTS } from '@/lib/data';
import { createRng } from '@/lib/engine/rng';

const base = {
  tournaments: TOURNAMENTS,
  seenIds: [] as string[],
};

describe('generateQuestion', () => {
  it('returns a question for filter "all"', () => {
    const q = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'all', rng: createRng(1) });
    expect(q.id).toBeTruthy();
    expect(q.prompt).toBeTruthy();
  });

  it('respects a specific tournament filter', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateQuestion({ ...base, targetDifficulty: 2, tournamentFilter: 2014, rng: createRng(i) });
      // Las preguntas cross-tournament (not-champion) no tienen año fijo del torneo objetivo;
      // pero si tournamentYear está definido, debe coincidir con el filtro.
      if (q.tournamentYear !== undefined && !q.id.startsWith('not-champion')) {
        expect(q.tournamentYear).toBe(2014);
      }
    }
  });

  it('avoids ids already in seenIds when possible', () => {
    const seen: string[] = [];
    const rng = createRng(99);
    for (let i = 0; i < 8; i++) {
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: 1,
        tournamentFilter: 2010,
        seenIds: seen,
        rng,
      });
      expect(seen).not.toContain(q.id);
      seen.push(q.id);
    }
  });

  it('selects from the sequential tournament for maratón', () => {
    const q0 = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'sequential', sequenceIndex: 0, rng: createRng(3) });
    if (q0.tournamentYear !== undefined && !q0.id.startsWith('not-champion')) {
      expect(q0.tournamentYear).toBe(1998);
    }
    const q6 = generateQuestion({ ...base, targetDifficulty: 1, tournamentFilter: 'sequential', sequenceIndex: 6, rng: createRng(3) });
    if (q6.tournamentYear !== undefined && !q6.id.startsWith('not-champion')) {
      expect(q6.tournamentYear).toBe(2022);
    }
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/generateQuestion.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el selector**

Create `lib/engine/generateQuestion.ts`:
```ts
import type { Question, Tournament } from '@/lib/data/types';
import type { Rng } from '@/lib/engine/rng';
import { GENERATORS, type Generator } from '@/lib/engine/questionGenerators';

export type TournamentFilter = number | 'all' | 'sequential';

export interface SelectOptions {
  tournaments: Tournament[];
  targetDifficulty: number;          // 1..5
  tournamentFilter: TournamentFilter;
  sequenceIndex?: number;            // requerido si filter === 'sequential'
  seenIds: string[];
  rng: Rng;
}

const MAX_ATTEMPTS = 25;

function candidateTournaments(opts: SelectOptions): Tournament[] {
  const { tournaments, tournamentFilter, sequenceIndex } = opts;
  if (tournamentFilter === 'all') return tournaments;
  if (tournamentFilter === 'sequential') {
    const idx = Math.min(sequenceIndex ?? 0, tournaments.length - 1);
    return [tournaments[idx]];
  }
  const one = tournaments.find((t) => t.year === tournamentFilter);
  return one ? [one] : tournaments;
}

function generatorsForDifficulty(target: number): Generator[] {
  // Ventana de ±1; si vacía, se ensancha progresivamente.
  for (let window = 1; window <= 5; window++) {
    const matches = GENERATORS.filter((g) => Math.abs(g.difficulty - target) <= window);
    if (matches.length > 0) return matches;
  }
  return GENERATORS;
}

export function generateQuestion(opts: SelectOptions): Question {
  const { rng, seenIds } = opts;
  const tournaments = candidateTournaments(opts);
  const generators = generatorsForDifficulty(opts.targetDifficulty);
  const seen = new Set(seenIds);

  let fallback: Question | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const gen = rng.pick(generators);
    const t = rng.pick(tournaments);
    const q = gen.build(t, opts.tournaments, rng);
    if (!fallback) fallback = q;
    if (!seen.has(q.id)) return q;
  }
  // Todas las candidatas ya vistas: devolvemos la última generada igual.
  return fallback!;
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/generateQuestion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/generateQuestion.ts lib/engine/generateQuestion.test.ts
git commit -m "feat: add question selector with non-repetition"
```

---

## Task 8: Puntuación

**Files:**
- Create: `lib/engine/scoring.ts`
- Test: `lib/engine/scoring.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/scoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scoreAnswer, numericCloseness } from '@/lib/engine/scoring';

const base = { base: 100, speedBonusMax: 100, streakMultiplierStep: 0.1 };

describe('numericCloseness', () => {
  it('is 1 for an exact match', () => {
    expect(numericCloseness(8, 8, 2)).toBe(1);
  });
  it('is 0 at or beyond the tolerance', () => {
    expect(numericCloseness(10, 8, 2)).toBe(0);
    expect(numericCloseness(20, 8, 2)).toBe(0);
  });
  it('scales linearly within the tolerance', () => {
    expect(numericCloseness(9, 8, 2)).toBeCloseTo(0.5);
  });
});

describe('scoreAnswer', () => {
  it('returns 0 for a wrong answer', () => {
    expect(scoreAnswer({ ...base, correct: false, difficulty: 1, streak: 0 })).toBe(0);
  });

  it('awards more points for higher difficulty', () => {
    const easy = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0 });
    const hard = scoreAnswer({ ...base, correct: true, difficulty: 5, streak: 0 });
    expect(hard).toBeGreaterThan(easy);
  });

  it('adds a speed bonus proportional to time remaining', () => {
    const slow = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0, timeRemainingRatio: 0 });
    const fast = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0, timeRemainingRatio: 1 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('applies the streak multiplier', () => {
    const noStreak = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 0 });
    const streak5 = scoreAnswer({ ...base, correct: true, difficulty: 1, streak: 5 });
    expect(streak5).toBeGreaterThan(noStreak);
  });

  it('scales by closeness for numeric answers', () => {
    const partial = scoreAnswer({ ...base, correct: true, difficulty: 3, streak: 0, closeness: 0.5 });
    const full = scoreAnswer({ ...base, correct: true, difficulty: 3, streak: 0, closeness: 1 });
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/scoring.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar la puntuación**

Create `lib/engine/scoring.ts`:
```ts
export interface ScoreInput {
  correct: boolean;
  difficulty: number;            // 1..5
  streak: number;                // racha ANTES de esta respuesta
  base: number;
  speedBonusMax: number;
  streakMultiplierStep: number;
  timeRemainingRatio?: number;   // 0..1, solo modos con reloj
  closeness?: number;            // 0..1, solo formato number
}

export function numericCloseness(guess: number, answer: number, tolerance: number): number {
  const diff = Math.abs(guess - answer);
  if (diff === 0) return 1;
  if (diff >= tolerance) return 0;
  return 1 - diff / tolerance;
}

export function scoreAnswer(input: ScoreInput): number {
  if (!input.correct) return 0;
  const difficultyPoints = input.base * (1 + (input.difficulty - 1) * 0.25);
  const speed = input.timeRemainingRatio != null
    ? input.speedBonusMax * input.timeRemainingRatio
    : 0;
  const streakMultiplier = 1 + input.streak * input.streakMultiplierStep;
  const closenessFactor = input.closeness != null ? input.closeness : 1;
  return Math.round((difficultyPoints + speed) * streakMultiplier * closenessFactor);
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/scoring.ts lib/engine/scoring.test.ts
git commit -m "feat: add scoring with difficulty, speed, streak and closeness"
```

---

## Task 9: Dificultad adaptativa

**Files:**
- Create: `lib/engine/difficulty.ts`
- Test: `lib/engine/difficulty.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/difficulty.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nextDifficulty } from '@/lib/engine/difficulty';

describe('nextDifficulty', () => {
  it('keeps difficulty until there are enough samples', () => {
    expect(nextDifficulty(3, [true, true])).toBe(3);
  });

  it('raises difficulty on high accuracy', () => {
    expect(nextDifficulty(3, [true, true, true])).toBe(4);
  });

  it('lowers difficulty on low accuracy', () => {
    expect(nextDifficulty(3, [false, false, false])).toBe(2);
  });

  it('stays in the middle band', () => {
    expect(nextDifficulty(3, [true, false, true])).toBe(3);
  });

  it('never goes below 1 or above 5', () => {
    expect(nextDifficulty(5, [true, true, true, true])).toBe(5);
    expect(nextDifficulty(1, [false, false, false, false])).toBe(1);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/difficulty.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Create `lib/engine/difficulty.ts`:
```ts
const MIN_SAMPLES = 3;
const RAISE_THRESHOLD = 0.8;
const LOWER_THRESHOLD = 0.4;

export function nextDifficulty(current: number, recentResults: boolean[]): number {
  if (recentResults.length < MIN_SAMPLES) return current;
  const accuracy = recentResults.filter(Boolean).length / recentResults.length;
  if (accuracy >= RAISE_THRESHOLD) return Math.min(5, current + 1);
  if (accuracy <= LOWER_THRESHOLD) return Math.max(1, current - 1);
  return current;
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/difficulty.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/difficulty.ts lib/engine/difficulty.test.ts
git commit -m "feat: add adaptive difficulty logic"
```

---

## Task 10: Configuración de modos

**Files:**
- Create: `lib/modes/modes.ts`
- Test: `lib/modes/modes.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/modes/modes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MODES, getMode } from '@/lib/modes/modes';

describe('MODES', () => {
  it('defines exactly the 6 Group-A modes', () => {
    expect(MODES.map((m) => m.id).sort()).toEqual(
      ['contrarreloj', 'escalera', 'experto', 'maraton', 'por-mundial', 'supervivencia'].sort(),
    );
  });

  it('every mode has scoring config and a question count', () => {
    for (const m of MODES) {
      expect(m.scoring.base).toBeGreaterThan(0);
      expect(m.questionCount).toBeDefined();
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.icon.length).toBeGreaterThan(0);
    }
  });

  it('contrarreloj has a timer', () => {
    expect(getMode('contrarreloj')!.timer).toBeDefined();
  });

  it('supervivencia has lives', () => {
    expect(getMode('supervivencia')!.lives).toBe(3);
  });

  it('escalera allows cash-out', () => {
    expect(getMode('escalera')!.allowCashOut).toBe(true);
  });

  it('maraton is sequential', () => {
    expect(getMode('maraton')!.tournamentFilter).toBe('sequential');
  });

  it('getMode returns undefined for unknown ids', () => {
    expect(getMode('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/modes/modes.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar los modos**

Create `lib/modes/modes.ts`:
```ts
import type { TournamentFilter } from '@/lib/engine/generateQuestion';

export type DifficultyCurve = 'fixed' | 'ascending' | 'adaptive';

export interface GameMode {
  id: string;
  name: string;
  icon: string;                  // emoji
  description: string;
  tournamentFilter: TournamentFilter;
  difficultyCurve: DifficultyCurve;
  difficultyRange?: [number, number];
  timer?: { totalSeconds: number; bonusPerCorrect: number };
  lives?: number;
  questionCount: number | 'until-fail';
  allowCashOut?: boolean;
  scoring: { base: number; speedBonusMax: number; streakMultiplierStep: number };
}

const defaultScoring = { base: 100, speedBonusMax: 0, streakMultiplierStep: 0.1 };

export const MODES: GameMode[] = [
  {
    id: 'por-mundial',
    name: 'Por Mundial',
    icon: '🏆',
    description: 'Elige una edición y responde solo preguntas de ese Mundial.',
    tournamentFilter: 'all',     // se sobrescribe en runtime con el año elegido
    difficultyCurve: 'adaptive',
    questionCount: 10,
    scoring: { ...defaultScoring },
  },
  {
    id: 'contrarreloj',
    name: 'Contrarreloj',
    icon: '⏱️',
    description: '60 segundos para sumar todos los puntos que puedas. La velocidad da bonus.',
    tournamentFilter: 'all',
    difficultyCurve: 'adaptive',
    timer: { totalSeconds: 60, bonusPerCorrect: 3 },
    questionCount: 'until-fail',
    scoring: { base: 80, speedBonusMax: 120, streakMultiplierStep: 0.1 },
  },
  {
    id: 'supervivencia',
    name: 'Supervivencia',
    icon: '❤️',
    description: '3 vidas. La dificultad sube con cada acierto. ¿Cuánto aguantas?',
    tournamentFilter: 'all',
    difficultyCurve: 'ascending',
    lives: 3,
    questionCount: 'until-fail',
    scoring: { base: 120, speedBonusMax: 0, streakMultiplierStep: 0.15 },
  },
  {
    id: 'escalera',
    name: 'Escalera',
    icon: '🪜',
    description: 'La dificultad sube y el multiplicador crece. Retírate con tus puntos… o arriésgalos.',
    tournamentFilter: 'all',
    difficultyCurve: 'ascending',
    questionCount: 'until-fail',
    allowCashOut: true,
    scoring: { base: 100, speedBonusMax: 0, streakMultiplierStep: 0.25 },
  },
  {
    id: 'maraton',
    name: 'Maratón Mundialista',
    icon: '🌍',
    description: 'Recorre 1998 → 2022 en una sola partida épica.',
    tournamentFilter: 'sequential',
    difficultyCurve: 'adaptive',
    questionCount: 21,           // 3 preguntas × 7 torneos
    scoring: { ...defaultScoring },
  },
  {
    id: 'experto',
    name: 'Modo Experto',
    icon: '🧠',
    description: 'Solo preguntas difíciles y multiplicadores altos. Para los que se las saben todas.',
    tournamentFilter: 'all',
    difficultyCurve: 'fixed',
    difficultyRange: [4, 5],
    questionCount: 10,
    scoring: { base: 150, speedBonusMax: 0, streakMultiplierStep: 0.2 },
  },
];

export function getMode(id: string): GameMode | undefined {
  return MODES.find((m) => m.id === id);
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/modes/modes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/modes/modes.ts lib/modes/modes.test.ts
git commit -m "feat: add the six Group-A game mode configs"
```

---

## Task 11: Reducer de sesión (máquina de estados)

**Files:**
- Create: `lib/engine/gameSession.ts`
- Test: `lib/engine/gameSession.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/engine/gameSession.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sessionReducer, initialSessionState, type SessionState } from '@/lib/engine/gameSession';
import type { Question } from '@/lib/data/types';

const q = (id: string): Question => ({
  id,
  format: 'multiple-choice',
  prompt: 'p',
  options: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  difficulty: 2,
  explanation: 'e',
  tags: [],
});

function start(overrides: Partial<{ lives: number | null; timeRemaining: number | null }> = {}): SessionState {
  return sessionReducer(initialSessionState, {
    type: 'START',
    question: q('q1'),
    difficulty: 2,
    lives: overrides.lives ?? null,
    timeRemaining: overrides.timeRemaining ?? null,
  });
}

describe('sessionReducer', () => {
  it('START puts the session into the question state', () => {
    const s = start();
    expect(s.status).toBe('question');
    expect(s.currentQuestion?.id).toBe('q1');
    expect(s.questionNumber).toBe(1);
    expect(s.score).toBe(0);
  });

  it('ANSWER correct increases score and streak, then shows feedback', () => {
    let s = start();
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 100 });
    expect(s.status).toBe('feedback');
    expect(s.score).toBe(100);
    expect(s.streak).toBe(1);
    expect(s.lastPointsEarned).toBe(100);
    expect(s.history).toHaveLength(1);
  });

  it('ANSWER wrong resets streak and costs a life', () => {
    let s = start({ lives: 3 });
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 100 });
    s = sessionReducer(s, { type: 'NEXT', question: q('q2'), difficulty: 2 });
    s = sessionReducer(s, { type: 'ANSWER', correct: false, points: 0 });
    expect(s.streak).toBe(0);
    expect(s.lives).toBe(2);
    expect(s.status).toBe('feedback');
  });

  it('reaching 0 lives ends the game', () => {
    let s = start({ lives: 1 });
    s = sessionReducer(s, { type: 'ANSWER', correct: false, points: 0 });
    expect(s.lives).toBe(0);
    expect(s.status).toBe('gameover');
  });

  it('NEXT advances to a new question and increments the counter', () => {
    let s = start();
    s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 50 });
    s = sessionReducer(s, { type: 'NEXT', question: q('q2'), difficulty: 3 });
    expect(s.status).toBe('question');
    expect(s.currentQuestion?.id).toBe('q2');
    expect(s.questionNumber).toBe(2);
    expect(s.difficulty).toBe(3);
  });

  it('TICK decrements the timer and ends at zero', () => {
    let s = start({ timeRemaining: 2 });
    s = sessionReducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(1);
    s = sessionReducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(0);
    expect(s.status).toBe('gameover');
  });

  it('CASH_OUT ends the game and flags cashedOut', () => {
    let s = start();
    s = sessionReducer(s, { type: 'CASH_OUT' });
    expect(s.status).toBe('gameover');
    expect(s.cashedOut).toBe(true);
  });

  it('keeps only the last 5 recent results', () => {
    let s = start();
    for (let i = 0; i < 7; i++) {
      s = sessionReducer(s, { type: 'ANSWER', correct: true, points: 10 });
      s = sessionReducer(s, { type: 'NEXT', question: q(`x${i}`), difficulty: 2 });
    }
    expect(s.recentResults.length).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/engine/gameSession.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el reducer**

Create `lib/engine/gameSession.ts`:
```ts
import type { Question } from '@/lib/data/types';

export type SessionStatus = 'idle' | 'question' | 'feedback' | 'gameover';

export interface AnswerRecord {
  question: Question;
  correct: boolean;
  pointsEarned: number;
}

export interface SessionState {
  status: SessionStatus;
  questionNumber: number;          // 1-based: cuántas preguntas se han mostrado
  score: number;
  streak: number;
  lives: number | null;            // null = sin sistema de vidas
  timeRemaining: number | null;    // null = sin reloj
  difficulty: number;
  currentQuestion: Question | null;
  recentResults: boolean[];        // últimas 5 respuestas (para dificultad adaptativa)
  lastPointsEarned: number;
  history: AnswerRecord[];
  cashedOut: boolean;
}

export type SessionAction =
  | { type: 'START'; question: Question; difficulty: number; lives: number | null; timeRemaining: number | null }
  | { type: 'ANSWER'; correct: boolean; points: number }
  | { type: 'NEXT'; question: Question; difficulty: number }
  | { type: 'TICK' }
  | { type: 'CASH_OUT' }
  | { type: 'END' };

const RECENT_LIMIT = 5;

export const initialSessionState: SessionState = {
  status: 'idle',
  questionNumber: 0,
  score: 0,
  streak: 0,
  lives: null,
  timeRemaining: null,
  difficulty: 1,
  currentQuestion: null,
  recentResults: [],
  lastPointsEarned: 0,
  history: [],
  cashedOut: false,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      return {
        ...initialSessionState,
        status: 'question',
        questionNumber: 1,
        difficulty: action.difficulty,
        lives: action.lives,
        timeRemaining: action.timeRemaining,
        currentQuestion: action.question,
      };

    case 'ANSWER': {
      if (state.status !== 'question' || !state.currentQuestion) return state;
      const recentResults = [...state.recentResults, action.correct].slice(-RECENT_LIMIT);
      const lives = state.lives != null && !action.correct ? state.lives - 1 : state.lives;
      const history: AnswerRecord[] = [
        ...state.history,
        { question: state.currentQuestion, correct: action.correct, pointsEarned: action.points },
      ];
      const dead = lives != null && lives <= 0;
      return {
        ...state,
        status: dead ? 'gameover' : 'feedback',
        score: state.score + action.points,
        streak: action.correct ? state.streak + 1 : 0,
        lives,
        recentResults,
        lastPointsEarned: action.points,
        history,
      };
    }

    case 'NEXT':
      if (state.status === 'gameover') return state;
      return {
        ...state,
        status: 'question',
        questionNumber: state.questionNumber + 1,
        difficulty: action.difficulty,
        currentQuestion: action.question,
      };

    case 'TICK': {
      if (state.timeRemaining == null) return state;
      const timeRemaining = state.timeRemaining - 1;
      return {
        ...state,
        timeRemaining: Math.max(0, timeRemaining),
        status: timeRemaining <= 0 ? 'gameover' : state.status,
      };
    }

    case 'CASH_OUT':
      return { ...state, status: 'gameover', cashedOut: true };

    case 'END':
      return { ...state, status: 'gameover' };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/engine/gameSession.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/gameSession.ts lib/engine/gameSession.test.ts
git commit -m "feat: add game session reducer (state machine)"
```

---

## Task 12: Persistencia en localStorage

**Files:**
- Create: `lib/storage/localStore.ts`
- Test: `lib/storage/localStore.test.ts`

- [ ] **Step 1: Escribir el test**

Create `lib/storage/localStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  loadData, saveData, recordGame, addSeenIds, defaultSaveData, type StorageLike,
} from '@/lib/storage/localStore';

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
  };
}

describe('localStore', () => {
  it('returns defaults when storage is empty', () => {
    const s = fakeStorage();
    expect(loadData(s)).toEqual(defaultSaveData());
  });

  it('round-trips saved data', () => {
    const s = fakeStorage();
    const data = { ...defaultSaveData(), totalPoints: 500, bestStreak: 7 };
    saveData(data, s);
    expect(loadData(s)).toEqual(data);
  });

  it('returns defaults if stored JSON is corrupt', () => {
    const s = fakeStorage();
    s.setItem('mundialquiz:v1', '{not valid json');
    expect(loadData(s)).toEqual(defaultSaveData());
  });

  it('recordGame accumulates points, high scores, streaks and stats', () => {
    const s = fakeStorage();
    recordGame({ modeId: 'contrarreloj', score: 300, bestStreak: 4, correct: 6, answered: 8 }, s);
    recordGame({ modeId: 'contrarreloj', score: 200, bestStreak: 9, correct: 3, answered: 5 }, s);
    const data = loadData(s);
    expect(data.totalPoints).toBe(500);
    expect(data.highScores.contrarreloj).toBe(300); // se queda el mayor
    expect(data.bestStreak).toBe(9);
    expect(data.stats.gamesPlayed).toBe(2);
    expect(data.stats.totalCorrect).toBe(9);
    expect(data.stats.totalAnswered).toBe(13);
  });

  it('addSeenIds keeps a bounded buffer', () => {
    const s = fakeStorage();
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`);
    addSeenIds(ids, 200, s);
    const data = loadData(s);
    expect(data.seenIds.length).toBe(200);
    // conserva los más recientes
    expect(data.seenIds).toContain('id249');
    expect(data.seenIds).not.toContain('id0');
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/storage/localStore.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar la persistencia**

Create `lib/storage/localStore.ts`:
```ts
export interface Stats {
  gamesPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
}

export interface SaveData {
  totalPoints: number;
  highScores: Record<string, number>;
  bestStreak: number;
  seenIds: string[];
  stats: Stats;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'mundialquiz:v1';

export function defaultSaveData(): SaveData {
  return {
    totalPoints: 0,
    highScores: {},
    bestStreak: 0,
    seenIds: [],
    stats: { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0 },
  };
}

// En SSR / entornos sin window, devuelve null para getItem.
function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      return (globalThis as unknown as { localStorage: StorageLike }).localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

export function loadData(storage?: StorageLike): SaveData {
  const s = resolveStorage(storage);
  if (!s) return defaultSaveData();
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return defaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSaveData(), ...parsed, stats: { ...defaultSaveData().stats, ...parsed.stats } };
  } catch {
    return defaultSaveData();
  }
}

export function saveData(data: SaveData, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno o no disponible: se ignora silenciosamente.
  }
}

export interface GameResult {
  modeId: string;
  score: number;
  bestStreak: number;
  correct: number;
  answered: number;
}

export function recordGame(result: GameResult, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const next: SaveData = {
    ...data,
    totalPoints: data.totalPoints + result.score,
    bestStreak: Math.max(data.bestStreak, result.bestStreak),
    highScores: {
      ...data.highScores,
      [result.modeId]: Math.max(data.highScores[result.modeId] ?? 0, result.score),
    },
    stats: {
      gamesPlayed: data.stats.gamesPlayed + 1,
      totalCorrect: data.stats.totalCorrect + result.correct,
      totalAnswered: data.stats.totalAnswered + result.answered,
    },
  };
  saveData(next, storage);
  return next;
}

export function addSeenIds(ids: string[], max = 200, storage?: StorageLike): SaveData {
  const data = loadData(storage);
  const merged = [...data.seenIds, ...ids].slice(-max);
  const next = { ...data, seenIds: merged };
  saveData(next, storage);
  return next;
}
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npx vitest run lib/storage/localStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Ejecutar toda la suite y commitear**

Run: `npm test`
Expected: PASS — toda la lógica del motor verde.
```bash
git add lib/storage/localStore.ts lib/storage/localStore.test.ts
git commit -m "feat: add localStorage persistence layer"
```

---

## Task 13: Tema "Fiesta Memphis" + layout raíz

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

> UI: estos cambios se verifican con `npm run build` (typecheck) y vista en `npm run dev`. No llevan test unitario.

- [ ] **Step 1: Reescribir `app/globals.css` con la paleta de marca**

Replace todo el contenido de `app/globals.css` con:
```css
@import "tailwindcss";

@theme {
  --color-indigo-base: #1b2a8f;
  --color-indigo-deep: #141a5e;
  --color-magenta: #ec1e9c;
  --color-red-flag: #e8332a;
  --color-gold: #ffce1f;
  --color-green-pitch: #14b866;
  --color-cyan-pop: #25c4d6;
  --color-purple-pop: #6f2dbd;
  --font-sans: var(--font-poppins), system-ui, sans-serif;
}

:root {
  color-scheme: dark;
}

body {
  background-color: var(--color-indigo-deep);
  color: #ffffff;
  font-family: var(--font-sans);
}

/* Respeto de accesibilidad: animaciones suaves si el usuario lo pide */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: Reescribir `app/layout.tsx`**

Replace todo el contenido de `app/layout.tsx` con:
```tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "MundialQuiz — Trivia de los Mundiales",
  description: "Pon a prueba cuánto sabes de los Mundiales 1998–2022 con quizzes dinámicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar el build**

Run: `npm run build`
Expected: build exitoso, sin errores de TypeScript ni de fuentes.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add Fiesta Memphis theme and root layout"
```

---

## Task 14: Componentes base de UI (fondo, botón, confeti)

**Files:**
- Create: `components/ui/MemphisBackground.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Confetti.tsx`
- Modify: `package.json` (instalar framer-motion)

- [ ] **Step 1: Instalar Framer Motion**

Run:
```bash
npm install framer-motion
```
Expected: `framer-motion` añadido a `dependencies`.

- [ ] **Step 2: Crear `components/ui/MemphisBackground.tsx`**

```tsx
// Fondo decorativo geométrico estilo Memphis. Puramente visual (aria-hidden).
export function MemphisBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--color-indigo-deep)]">
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[var(--color-magenta)] opacity-20 blur-2xl" />
      <div className="absolute right-0 top-1/3 h-52 w-52 rounded-full bg-[var(--color-cyan-pop)] opacity-15 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-44 w-44 rounded-full bg-[var(--color-gold)] opacity-15 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Crear `components/ui/Button.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "gold";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-magenta)] text-white",
  gold: "bg-[var(--color-gold)] text-[var(--color-indigo-deep)]",
  ghost: "bg-white/10 text-white border border-white/20",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-6 py-3 font-extrabold shadow-lg disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
```

- [ ] **Step 4: Crear `components/ui/Confetti.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

const COLORS = ["#ec1e9c", "#ffce1f", "#14b866", "#25c4d6", "#6f2dbd", "#e8332a"];

// Confeti simple basado en el índice de la pieza (determinista, sin Math.random en render).
export function Confetti({ pieces = 24 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 6) * 0.05;
        const color = COLORS[i % COLORS.length];
        const drift = ((i % 5) - 2) * 20;
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 420, x: drift, opacity: 0, rotate: 360 }}
            transition={{ duration: 1.4, delay, ease: "easeIn" }}
            className="absolute top-0 h-3 w-2 rounded-sm"
            style={{ left: `${left}%`, backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Verificar el build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add components/ui package.json package-lock.json
git commit -m "feat: add base UI components (background, button, confetti)"
```

---

## Task 15: Componentes de formato de pregunta

**Files:**
- Create: `components/formats/MultipleChoice.tsx`
- Create: `components/formats/TrueFalse.tsx`
- Create: `components/formats/NumberInput.tsx`
- Create: `components/formats/OddOneOut.tsx`

> Contrato común: cada componente recibe la `Question` y un callback `onAnswer`. `MultipleChoice`, `TrueFalse` y `OddOneOut` llaman `onAnswer(selectedIndex)`. `NumberInput` llama `onAnswer(value)` con el número ingresado. El componente NO decide si es correcto; eso lo hace el hook de sesión.

- [ ] **Step 1: Crear `components/formats/MultipleChoice.tsx`**

```tsx
"use client";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function MultipleChoice({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="grid gap-3">
      {question.options!.map((opt, i) => (
        <Button key={i} variant="ghost" disabled={disabled} onClick={() => onAnswer(i)} className="text-left">
          {opt}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `components/formats/OddOneOut.tsx`**

```tsx
"use client";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function OddOneOut({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options!.map((opt, i) => (
        <Button key={i} variant="ghost" disabled={disabled} onClick={() => onAnswer(i)}>
          {opt}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Crear `components/formats/TrueFalse.tsx`**

```tsx
"use client";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function TrueFalse({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="gold" disabled={disabled} onClick={() => onAnswer(0)}>
        ✓ {question.options![0]}
      </Button>
      <Button variant="ghost" disabled={disabled} onClick={() => onAnswer(1)}>
        ✗ {question.options![1]}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Crear `components/formats/NumberInput.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { Question } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";

export function NumberInput({
  question,
  disabled,
  onAnswer,
}: {
  question: Question;
  disabled?: boolean;
  onAnswer: (value: number) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const n = Number(value);
    if (Number.isFinite(n)) onAnswer(n);
  }

  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tu respuesta…"
        aria-label={question.prompt}
        className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-lg font-bold text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-pop)]"
      />
      <Button type="submit" variant="gold" disabled={disabled || value === ""}>
        OK
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Verificar el build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add components/formats
git commit -m "feat: add question format components"
```

---

## Task 16: QuestionCard (orquesta formato + feedback)

**Files:**
- Create: `components/QuestionCard.tsx`

> `QuestionCard` muestra el enunciado, renderiza el componente de formato adecuado y, tras responder, muestra feedback (correcto/incorrecto + explicación) con confeti si se acertó. Recibe del hook si la respuesta fue correcta.

- [ ] **Step 1: Crear `components/QuestionCard.tsx`**

```tsx
"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Question } from "@/lib/data/types";
import { MultipleChoice } from "@/components/formats/MultipleChoice";
import { TrueFalse } from "@/components/formats/TrueFalse";
import { OddOneOut } from "@/components/formats/OddOneOut";
import { NumberInput } from "@/components/formats/NumberInput";
import { Confetti } from "@/components/ui/Confetti";
import { Button } from "@/components/ui/Button";

export interface FeedbackInfo {
  correct: boolean;
  pointsEarned: number;
}

export function QuestionCard({
  question,
  feedback,
  onAnswer,
  onNext,
  isLast,
}: {
  question: Question;
  feedback: FeedbackInfo | null;
  onAnswer: (answer: number) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const answered = feedback !== null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-xl rounded-3xl bg-[var(--color-indigo-base)] p-6 shadow-2xl"
      >
        {answered && feedback.correct && <Confetti />}

        {question.tournamentYear && (
          <span className="mb-3 inline-block rounded-full bg-[var(--color-magenta)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide">
            Mundial {question.tournamentYear}
          </span>
        )}

        <h2 className="mb-5 text-xl font-black leading-tight sm:text-2xl">{question.prompt}</h2>

        {question.format === "multiple-choice" && (
          <MultipleChoice question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "odd-one-out" && (
          <OddOneOut question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "true-false" && (
          <TrueFalse question={question} disabled={answered} onAnswer={onAnswer} />
        )}
        {question.format === "number" && (
          <NumberInput question={question} disabled={answered} onAnswer={onAnswer} />
        )}

        {answered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-5 rounded-2xl bg-white/10 p-4"
          >
            <p className="text-lg font-black" style={{ color: feedback.correct ? "var(--color-green-pitch)" : "var(--color-red-flag)" }}>
              {feedback.correct ? `¡Correcto! +${feedback.pointsEarned}` : "Incorrecto"}
            </p>
            <p className="mt-1 text-sm text-white/80">{question.explanation}</p>
            <div className="mt-4">
              <Button variant="gold" onClick={onNext}>
                {isLast ? "Ver resultados" : "Siguiente →"}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verificar el build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add components/QuestionCard.tsx
git commit -m "feat: add QuestionCard with feedback and confetti"
```

---

## Task 17: HUD (puntos / reloj / vidas / racha)

**Files:**
- Create: `components/Hud.tsx`

- [ ] **Step 1: Crear `components/Hud.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

export function Hud({
  score,
  streak,
  lives,
  timeRemaining,
  questionNumber,
  totalQuestions,
}: {
  score: number;
  streak: number;
  lives: number | null;
  timeRemaining: number | null;
  questionNumber: number;
  totalQuestions: number | null;
}) {
  const lowTime = timeRemaining != null && timeRemaining <= 10;

  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-3 text-sm font-extrabold">
      <span className="rounded-full bg-[var(--color-gold)] px-3 py-1 text-[var(--color-indigo-deep)]">
        {score} pts
      </span>

      {streak > 1 && (
        <span className="rounded-full bg-white/10 px-3 py-1">🔥 x{streak}</span>
      )}

      {lives != null && (
        <span className="rounded-full bg-white/10 px-3 py-1">
          {"❤️".repeat(Math.max(0, lives))}
        </span>
      )}

      {timeRemaining != null && (
        <motion.span
          animate={lowTime ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ repeat: lowTime ? Infinity : 0, duration: 0.6 }}
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: lowTime ? "var(--color-red-flag)" : "rgba(255,255,255,0.1)" }}
        >
          ⏱ {timeRemaining}s
        </motion.span>
      )}

      {totalQuestions != null && (
        <span className="rounded-full bg-white/10 px-3 py-1">
          {questionNumber}/{totalQuestions}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar el build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add components/Hud.tsx
git commit -m "feat: add HUD component"
```

---

## Task 18: Hook useGameSession (integra todo)

**Files:**
- Create: `hooks/useGameSession.ts`

> Este hook une el reducer con el selector de preguntas, el scoring, la dificultad adaptativa, el timer y la persistencia. Es el cerebro del lado cliente.

- [ ] **Step 1: Crear `hooks/useGameSession.ts`**

```tsx
"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TOURNAMENTS } from "@/lib/data";
import { createRng, type Rng } from "@/lib/engine/rng";
import { generateQuestion, type TournamentFilter } from "@/lib/engine/generateQuestion";
import { sessionReducer, initialSessionState } from "@/lib/engine/gameSession";
import { scoreAnswer, numericCloseness } from "@/lib/engine/scoring";
import { nextDifficulty } from "@/lib/engine/difficulty";
import { loadData, recordGame, addSeenIds } from "@/lib/storage/localStore";
import type { GameMode } from "@/lib/modes/modes";
import type { Question } from "@/lib/data/types";
import type { FeedbackInfo } from "@/components/QuestionCard";

// Semilla por carga: el caller la pasa para mantener pureza/SSR (ver página de juego).
export function useGameSession(mode: GameMode, seed: number, tournamentOverride?: number) {
  const rngRef = useRef<Rng>(createRng(seed));
  const seenRef = useRef<string[]>(loadData().seenIds);
  const newSeenRef = useRef<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackInfo | null>(null);
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const savedRef = useRef(false);

  const filter: TournamentFilter = useMemo(() => {
    if (tournamentOverride) return tournamentOverride;
    return mode.tournamentFilter;
  }, [mode.tournamentFilter, tournamentOverride]);

  const totalQuestions = mode.questionCount === "until-fail" ? null : mode.questionCount;

  const startDifficulty = mode.difficultyRange ? mode.difficultyRange[0] : mode.difficultyCurve === "ascending" ? 1 : 2;

  // En modo "sequential" (maratón) repartimos las preguntas equitativamente
  // entre los 7 torneos: 3 preguntas por torneo si questionCount = 21.
  const perTournament = totalQuestions ? Math.max(1, Math.floor(totalQuestions / TOURNAMENTS.length)) : 1;

  const pickQuestion = useCallback(
    (difficulty: number, ordinal: number): Question => {
      const clamped = mode.difficultyRange
        ? Math.min(mode.difficultyRange[1], Math.max(mode.difficultyRange[0], difficulty))
        : difficulty;
      const sequenceIndex =
        filter === "sequential" ? Math.floor(ordinal / perTournament) : 0;
      const q = generateQuestion({
        tournaments: TOURNAMENTS,
        targetDifficulty: clamped,
        tournamentFilter: filter,
        sequenceIndex,
        seenIds: [...seenRef.current, ...newSeenRef.current],
        rng: rngRef.current,
      });
      newSeenRef.current.push(q.id);
      return q;
    },
    [filter, mode.difficultyRange, perTournament],
  );

  // Arranque: una sola vez.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const q = pickQuestion(startDifficulty, 0);
    dispatch({
      type: "START",
      question: q,
      difficulty: startDifficulty,
      lives: mode.lives ?? null,
      timeRemaining: mode.timer ? mode.timer.totalSeconds : null,
    });
  }, [mode.lives, mode.timer, pickQuestion, startDifficulty]);

  // Timer (modos con reloj).
  useEffect(() => {
    if (!mode.timer || state.status === "gameover" || state.status === "idle") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [mode.timer, state.status]);

  // Calcula la siguiente dificultad según la curva del modo.
  const computeNextDifficulty = useCallback(
    (current: number, recent: boolean[]): number => {
      switch (mode.difficultyCurve) {
        case "adaptive":
          return nextDifficulty(current, recent);
        case "ascending":
          return Math.min(5, current + 1);
        case "fixed":
        default:
          return current;
      }
    },
    [mode.difficultyCurve],
  );

  const answer = useCallback(
    (raw: number) => {
      if (state.status !== "question" || !state.currentQuestion) return;
      const q = state.currentQuestion;

      let correct: boolean;
      let closeness: number | undefined;
      if (q.format === "number") {
        closeness = numericCloseness(raw, q.numericAnswer!, q.tolerance!);
        correct = closeness > 0;
      } else {
        correct = raw === q.answerIndex;
      }

      const timeRemainingRatio =
        mode.timer && state.timeRemaining != null ? state.timeRemaining / mode.timer.totalSeconds : undefined;

      const points = scoreAnswer({
        correct,
        difficulty: q.difficulty,
        streak: state.streak,
        base: mode.scoring.base,
        speedBonusMax: mode.scoring.speedBonusMax,
        streakMultiplierStep: mode.scoring.streakMultiplierStep,
        timeRemainingRatio,
        closeness,
      });

      setFeedback({ correct, pointsEarned: points });
      dispatch({ type: "ANSWER", correct, points });
    },
    [mode.scoring, mode.timer, state.currentQuestion, state.status, state.streak, state.timeRemaining],
  );

  const next = useCallback(() => {
    setFeedback(null);
    const answeredCount = state.questionNumber; // preguntas ya mostradas
    const reachedLimit = totalQuestions != null && answeredCount >= totalQuestions;
    if (reachedLimit) {
      dispatch({ type: "END" });
      return;
    }
    const nd = computeNextDifficulty(state.difficulty, state.recentResults);
    const q = pickQuestion(nd, answeredCount); // sequenceIndex = nº de preguntas ya hechas
    dispatch({ type: "NEXT", question: q, difficulty: nd });
  }, [computeNextDifficulty, pickQuestion, state.difficulty, state.questionNumber, state.recentResults, totalQuestions]);

  const cashOut = useCallback(() => dispatch({ type: "CASH_OUT" }), []);

  // Persistencia al terminar.
  useEffect(() => {
    if (state.status !== "gameover" || savedRef.current) return;
    savedRef.current = true;
    const answered = state.history.length;
    const correct = state.history.filter((h) => h.correct).length;
    const bestStreak = state.history.reduce(
      (acc, h) => {
        const cur = h.correct ? acc.cur + 1 : 0;
        return { cur, max: Math.max(acc.max, cur) };
      },
      { cur: 0, max: 0 },
    ).max;
    recordGame({ modeId: mode.id, score: state.score, bestStreak, correct, answered });
    addSeenIds(newSeenRef.current);
  }, [mode.id, state.history, state.score, state.status]);

  const isLast = totalQuestions != null && state.questionNumber >= totalQuestions;

  return { state, feedback, answer, next, cashOut, totalQuestions, isLast, allowCashOut: !!mode.allowCashOut };
}
```

- [ ] **Step 2: Verificar el build**

Run: `npm run build`
Expected: build exitoso (puede haber warnings de hooks deps; corrige solo si rompen el build).

- [ ] **Step 3: Commit**

```bash
git add hooks/useGameSession.ts
git commit -m "feat: add useGameSession hook wiring engine + persistence"
```

---

## Task 19: Home / selección de modo

**Files:**
- Modify: `app/page.tsx`
- Create: `components/ModeCard.tsx`

- [ ] **Step 1: Crear `components/ModeCard.tsx`**

```tsx
"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { GameMode } from "@/lib/modes/modes";

export function ModeCard({ mode, href }: { mode: GameMode; href: string }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className="flex h-full flex-col rounded-3xl bg-[var(--color-indigo-base)] p-5 shadow-xl ring-1 ring-white/10"
      >
        <span className="text-4xl">{mode.icon}</span>
        <h3 className="mt-3 text-lg font-black">{mode.name}</h3>
        <p className="mt-1 text-sm text-white/70">{mode.description}</p>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 2: Reescribir `app/page.tsx`**

```tsx
import Link from "next/link";
import { MODES } from "@/lib/modes/modes";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { ModeCard } from "@/components/ModeCard";
import { TOURNAMENT_YEARS } from "@/lib/data";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      <MemphisBackground />

      <h1 className="text-center text-4xl font-black sm:text-5xl">
        Mundial<span className="text-[var(--color-gold)]">Quiz</span>
      </h1>
      <p className="mt-2 text-center text-white/70">Trivia de los Mundiales 1998 – 2022</p>

      <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => {
          // "Por Mundial" lleva primero a elegir el año.
          const href = mode.id === "por-mundial" ? "/play/por-mundial" : `/play/${mode.id}`;
          return <ModeCard key={mode.id} mode={mode} href={href} />;
        })}
      </div>

      <p className="mt-10 text-xs text-white/50">
        Ediciones disponibles: {TOURNAMENT_YEARS.join(" · ")}
      </p>

      <Link href="#" className="sr-only">
        Inicio
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Verificar el build y la vista**

Run: `npm run build`
Expected: build exitoso.
Run: `npm run dev` y abre `http://localhost:3000` → debe verse la home con las 6 tarjetas de modo y el fondo Memphis. Detén el server (Ctrl+C) tras comprobar.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/ModeCard.tsx
git commit -m "feat: add home screen with mode selection"
```

---

## Task 20: Pantalla de juego + resultados

**Files:**
- Create: `app/play/[mode]/page.tsx`

> Esta página lee el `mode` de la URL (Promise en Next 16) y un `year` opcional de `searchParams` (para "Por Mundial"). Es un Client Component que usa `useGameSession`. Genera la semilla en el cliente tras montar (evita mismatch de hidratación y la restricción de SSR).

- [ ] **Step 1: Crear `app/play/[mode]/page.tsx`**

```tsx
"use client";
import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMode, type GameMode } from "@/lib/modes/modes";
import { getTournament, TOURNAMENT_YEARS } from "@/lib/data";
import { useGameSession } from "@/hooks/useGameSession";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { QuestionCard } from "@/components/QuestionCard";
import { Hud } from "@/components/Hud";
import { Button } from "@/components/ui/Button";

function LoadingScreen() {
  return (
    <main className="relative flex flex-1 items-center justify-center p-6">
      <MemphisBackground />
      <p className="font-black">Cargando…</p>
    </main>
  );
}

// useSearchParams debe vivir dentro de un boundary de Suspense (requisito de Next 16).
export default function PlayPage({ params }: PageProps<"/play/[mode]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayResolver params={params} />
    </Suspense>
  );
}

function PlayResolver({ params }: { params: PageProps<"/play/[mode]">["params"] }) {
  const { mode: modeId } = use(params);
  const mode = getMode(modeId);
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;

  if (!mode) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <MemphisBackground />
        <p className="text-xl font-black">Modo no encontrado.</p>
        <Link href="/" className="underline">Volver al inicio</Link>
      </main>
    );
  }

  // "Por Mundial" sin año → mostrar selector de torneo.
  if (mode.id === "por-mundial" && !year) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <MemphisBackground />
        <h1 className="text-2xl font-black">Elige un Mundial</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOURNAMENT_YEARS.map((y) => {
            const t = getTournament(y)!;
            return (
              <Link
                key={y}
                href={`/play/por-mundial?year=${y}`}
                className="rounded-2xl bg-[var(--color-indigo-base)] px-5 py-4 text-center font-black shadow-lg ring-1 ring-white/10 hover:scale-105"
              >
                <div className="text-2xl text-[var(--color-gold)]">{y}</div>
                <div className="text-xs text-white/60">{t.hosts.join(", ")}</div>
              </Link>
            );
          })}
        </div>
        <Link href="/" className="text-sm underline text-white/60">Volver</Link>
      </main>
    );
  }

  return <Game modeId={mode.id} year={year} />;
}

function Game({ modeId, year }: { modeId: string; year?: number }) {
  const mode = getMode(modeId)!;
  // Semilla generada en cliente tras montar (no en render SSR).
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => {
    setSeed(Date.now() >>> 0);
  }, []);

  if (seed === null) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando…</p>
      </main>
    );
  }
  return <GameInner mode={mode} seed={seed} year={year} />;
}

function GameInner({
  mode,
  seed,
  year,
}: {
  mode: GameMode;
  seed: number;
  year?: number;
}) {
  const { state, feedback, answer, next, cashOut, totalQuestions, isLast, allowCashOut } = useGameSession(
    mode,
    seed,
    year,
  );

  if (state.status === "gameover") {
    const answered = state.history.length;
    const correct = state.history.filter((h) => h.correct).length;
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <h1 className="text-3xl font-black">{state.cashedOut ? "¡Te retiraste a tiempo! 🪙" : "¡Fin del juego!"}</h1>
        <p className="text-6xl font-black text-[var(--color-gold)]">{state.score}</p>
        <p className="text-white/70">
          {correct} / {answered} aciertos
        </p>
        <div className="mt-4 flex gap-3">
          <Link href={`/play/${mode.id}${year ? `?year=${year}` : ""}`}>
            <Button variant="primary">Jugar de nuevo</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!state.currentQuestion) {
    return (
      <main className="relative flex flex-1 items-center justify-center p-6">
        <MemphisBackground />
        <p className="font-black">Cargando pregunta…</p>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-5 px-4 py-8">
      <MemphisBackground />
      <Hud
        score={state.score}
        streak={state.streak}
        lives={state.lives}
        timeRemaining={state.timeRemaining}
        questionNumber={state.questionNumber}
        totalQuestions={totalQuestions}
      />

      <QuestionCard
        question={state.currentQuestion}
        feedback={feedback}
        onAnswer={answer}
        onNext={next}
        isLast={isLast}
      />

      {allowCashOut && state.status === "question" && state.score > 0 && (
        <Button variant="gold" onClick={cashOut}>
          Retirarme con {state.score} pts 🪙
        </Button>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verificar el build**

Run: `npm run build`
Expected: build exitoso. Si TypeScript se queja del helper `PageProps<"/play/[mode]">`, ejecuta primero `npx next typegen` (genera los tipos de ruta) y vuelve a buildear.

- [ ] **Step 3: Verificación manual de juego**

Run: `npm run dev` y prueba en `http://localhost:3000`:
- Cada uno de los 6 modos arranca y muestra preguntas.
- Responder marca correcto/incorrecto, muestra explicación y suma puntos.
- Contrarreloj cuenta hacia atrás y termina a los 0s.
- Supervivencia quita vidas y termina a las 3 fallidas.
- Escalera muestra el botón "Retirarme".
- "Por Mundial" pide elegir año y luego solo pregunta de ese año.
- Maratón recorre torneos.
- La pantalla de resultados muestra puntaje y aciertos.
Detén el server tras comprobar.

- [ ] **Step 4: Commit**

```bash
git add app/play
git commit -m "feat: add game and results screen"
```

---

## Task 21: Integración final y verificación

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: PASS — toda la lógica (rng, generadores, selector, scoring, dificultad, modos, reducer, storage, datos) verde.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores (corrige los que aparezcan).

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Repaso manual final**

Run: `npm run dev` y verifica el recorrido completo de la sección "Verificación manual" del Task 20 una vez más, incluyendo que los puntos acumulados persisten entre partidas (recarga la página y vuelve a jugar; el récord/total debe mantenerse en localStorage).

- [ ] **Step 5: Commit final (si quedaron ajustes)**

```bash
git add -A
git commit -m "chore: final integration pass for MundialQuiz MVP"
```

---

## Cobertura del spec (autoverificación)

- **Datos 7 mundiales** → Task 5.
- **Generación dinámica desde hechos** → Tasks 6, 7.
- **4 formatos (MC, V/F, número, cuál NO)** → Tasks 6 (generadores) + 15 (UI).
- **6 modos Grupo A** → Task 10 (config) + 18, 20 (ejecución).
- **Puntos acumulables** → Tasks 8, 12.
- **Dificultad adaptativa** → Tasks 9, 18.
- **No-repetición** → Tasks 7, 12 (seenIds) + 18.
- **Persistencia local** → Task 12.
- **Estética Fiesta Memphis + paleta del logo** → Tasks 13, 14.
- **Animaciones (Framer Motion)** → Tasks 14, 15, 16, 17, 19.
- **Accesibilidad (prefers-reduced-motion)** → Task 13.
- **Next.js 16 (params/searchParams Promise, App Router)** → Tasks 19, 20.
- **Testing de funciones puras** → Tasks 2–12.
