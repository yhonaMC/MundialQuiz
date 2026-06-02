# MundialQuiz — Documento de Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado para planificación

## 1. Resumen

MundialQuiz es una app web de quiz sobre los Mundiales de fútbol **1998 → 2022** (7 ediciones: 1998, 2002, 2006, 2010, 2014, 2018, 2022). Corre 100% en el navegador, sin backend. Las preguntas no se escriben a mano: se **generan dinámicamente** desde una base de datos de hechos, lo que permite preguntas casi infinitas, sin repetición y con dificultad adaptativa.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion · TypeScript. Persistencia local vía `localStorage`. Sin cuentas ni servidor.

> ⚠️ Esta versión de Next.js (16.2.7) tiene cambios importantes respecto a versiones anteriores. Durante la implementación es **obligatorio** leer las guías en `node_modules/next/dist/docs/` antes de escribir código de Next (rutas, layouts, server/client components, etc.). Ver `AGENTS.md`.

### Decisiones tomadas en brainstorming
- **Persistencia:** solo local (sin cuentas, sin ranking online).
- **"Dinámico" significa:** múltiples modos + variedad de formatos + sin repetición + dificultad adaptativa (los cuatro).
- **Contenido:** generado desde base de datos de hechos (no banco pre-escrito).
- **Estética:** "Fiesta Memphis" con la paleta del logo (ver §8).
- **Idioma de la UI:** español.
- **Animaciones:** Framer Motion.

## 2. Alcance por fases

**Fase 1 (esta spec — MVP):** motor de preguntas + base de datos de los 7 mundiales + 6 modos del "Grupo A" + 4 formatos de pregunta + puntos + dificultad adaptativa + animaciones + persistencia local.

**Fase 2 (futuro, fuera de esta spec):**
- 🔍 **Adivina** — formato visual (escudos, banderas, estadios, trofeo); requiere assets de imágenes y UI propia.
- 📊 **Línea de Tiempo** — arrastrar y ordenar eventos cronológicamente; interacción propia.
- Opcionalmente: Desafío Diario y Práctica Libre.

## 3. Arquitectura

```
Datos (hechos por mundial)  →  Generadores  →  Pregunta
                                    ↑              ↓
                          dificultad + semilla   Motor de juego (reglas del modo)
                                                   ↓
                                Puntos / vidas / reloj / racha → Resultados
                                                   ↓
                          localStorage (puntos acumulados, récords, vistas)
```

Capas con responsabilidad única y bordes claros:

1. **Datos** (`lib/data/`): hechos estructurados, sin lógica.
2. **Generadores** (`lib/engine/questionGenerators/`): funciones puras que convierten datos en preguntas.
3. **Selector de preguntas** (`lib/engine/generateQuestion.ts`): elige generador según modo/dificultad, evita repeticiones.
4. **Motor de sesión** (`lib/engine/gameSession`): máquina de estados que aplica las reglas del modo.
5. **Modos** (`lib/modes/modes.ts`): configuración declarativa de cada modo.
6. **Persistencia** (`lib/storage/localStore.ts`): única puerta a `localStorage`.
7. **UI** (`app/`, `components/`): pantallas y componentes de presentación.

## 4. Modelo de datos

Un archivo TypeScript por mundial en `lib/data/tournaments/` (`1998.ts` … `2022.ts`), validado contra un tipo común en `lib/data/types.ts`.

```ts
interface Tournament {
  year: number;                 // 1998..2022
  hosts: string[];              // país(es) sede
  champion: string;             // selección campeona
  runnerUp: string;             // subcampeón
  third: string;                // tercer lugar
  finalScore: string;           // p.ej. "1-0" (incluye penales si aplica)
  finalVenue: string;           // estadio de la final
  goldenBoot: { player: string; goals: number };  // bota de oro
  goldenBall: string;           // mejor jugador
  mascot: string;
  numTeams: number;             // 32 en todas las ediciones 1998–2022
  totalGoals: number;
  participants: string[];       // selecciones participantes
  notableMatches: NotableMatch[]; // resultados destacados (octavos+)
}

interface NotableMatch {
  stage: string;                // "Final", "Semifinal", "Cuartos", ...
  teamA: string; teamB: string;
  score: string;
  note?: string;                // dato curioso opcional
}
```

La fiabilidad de los datos es crítica: cada archivo debe verificarse contra fuentes confiables. Los tests de datos validan invariantes básicas (campeón ∈ participantes, etc.).

## 5. Formatos de pregunta

Los 4 formatos de la Fase 1 (todos basados en texto):

- `multiple-choice` — 4 opciones, una correcta.
- `true-false` — afirmación con respuesta V/F.
- `number` — respuesta numérica; **puntúa por cercanía** (exacto = full, dentro de tolerancia = parcial).
- `odd-one-out` — 4 elementos, uno no pertenece.

```ts
type QuestionFormat = 'multiple-choice' | 'true-false' | 'number' | 'odd-one-out';

interface Question {
  id: string;            // hash determinista de (generador + parámetros) → para no repetir
  format: QuestionFormat;
  prompt: string;
  options?: string[];    // multiple-choice / true-false / odd-one-out
  answerIndex?: number;  // índice de la opción correcta
  numericAnswer?: number;// number
  tolerance?: number;    // number: margen para puntaje parcial
  difficulty: 1 | 2 | 3 | 4 | 5;
  tournamentYear?: number;
  explanation: string;   // se muestra en feedback
  tags: string[];
}
```

## 6. Generadores de preguntas

Cada generador es una **función pura** `(tournaments, difficulty, rng) => Question`. Declara qué formatos y qué rango de dificultad produce. Ejemplos:

- `championOf(year)` → "¿Quién ganó el Mundial {año}?" (multiple-choice; distractores = otros campeones/participantes).
- `wasChampion` → "V/F: {equipo} fue campeón en {año}".
- `goalsByPlayer` → "¿Cuántos goles metió {jugador}…?" (number).
- `notHost(year)` → "¿Cuál de estas NO fue sede del Mundial {año}?" (odd-one-out).
- `topScorerOf(year)`, `runnerUpOf(year)`, `mascotOf(year)`, `finalScoreOf(year)`, etc.

**Selector** (`generateQuestion.ts`): recibe `{ tournamentFilter, targetDifficulty, seed }`, elige un generador elegible, genera la pregunta, y si su `id` está en el buffer de "vistas recientes" reintenta. Garantiza no-repetición y respeta el filtro de torneo del modo.

**Aleatoriedad determinista:** se usa un RNG sembrado (no `Math.random()` directo en lógica testeable) para que las pruebas sean reproducibles y para soportar semillas por sesión.

## 7. Motor de juego y los 6 modos

Un único motor (máquina de estados / reducer en React) configurado por una `GameMode` declarativa:

```ts
interface GameMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  tournamentFilter: number | 'all' | 'sequential'; // sequential = maratón 1998→2022
  difficultyCurve: 'fixed' | 'ascending' | 'adaptive';
  difficultyRange?: [number, number];   // p.ej. experto [4,5]
  timer?: { totalSeconds: number; bonusPerCorrect: number };
  lives?: number;
  questionCount?: number | 'until-fail';
  allowCashOut?: boolean;                // escalera
  scoring: { base: number; speedBonusMax: number; streakMultiplierStep: number };
}
```

Configs de Fase 1:

| Modo | tournamentFilter | curva | timer | vidas | count | cashOut |
|------|------------------|-------|-------|-------|-------|---------|
| 🏆 Por Mundial | (elegido) | adaptive | — | — | 10 | no |
| ⏱️ Contrarreloj | all | adaptive | 60s, +3s | — | until-fail* | no |
| ❤️ Supervivencia | all | ascending | — | 3 | until-fail | no |
| 🪜 Escalera | all | ascending | — | — | until-fail | sí |
| 🌍 Maratón | sequential | adaptive | — | — | N por torneo × 7 | no |
| 🧠 Experto | all | fixed [4,5] | — | — | 10 | no |

\* Contrarreloj termina al acabarse el tiempo, no por fallar.

**Estados de la sesión:** `inicio → cargando → pregunta → feedback → (siguiente | fin) → resultados`. El reducer es una función pura y testeable; los efectos (timer, persistencia) viven en un hook contenedor (`useGameSession`).

## 8. Puntos, dificultad adaptativa y persistencia

**Puntos** (`lib/engine/scoring.ts`, puro):
- Base por acierto (escala con dificultad).
- Bonus de velocidad (proporción del tiempo restante, hasta `speedBonusMax`).
- Multiplicador por racha de aciertos consecutivos.
- `number`: puntaje parcial según cercanía dentro de `tolerance`.

**Dificultad adaptativa:** se mantiene una precisión móvil (últimas N respuestas). Sube la dificultad objetivo si la precisión es alta, la baja si es baja. Solo aplica a modos con curva `adaptive`.

**Persistencia (`localStorage`, vía `localStore.ts`):**
- `totalPoints` — puntos acumulados de por vida.
- `highScores` — récord por modo.
- `bestStreak` — mejor racha.
- `seenQuestionIds` — buffer circular (tamaño fijo, p.ej. 200) para no repetir.
- `stats` — partidas jugadas, aciertos, etc.

Toda lectura/escritura pasa por `localStore.ts` (con manejo de errores si `localStorage` no existe / está lleno).

## 9. Estética "Fiesta Memphis" y animaciones

**Paleta (del logo):** azul índigo `#1b2a8f` (base), magenta `#ec1e9c`, rojo `#e8332a`, amarillo `#ffce1f`, verde `#14b866`, cyan `#25c4d6`, morado `#6f2dbd`, blanco. Definida como variables CSS / tema de Tailwind.

**Estilo:** geometría colorida estilo Memphis — círculos, triángulos, confeti — sobre fondo índigo; tarjetas con esquinas redondeadas y colores vivos; tipografía contundente.

**Animaciones (Framer Motion):**
- Transición entre preguntas (entrada/salida).
- Feedback de acierto/error (color, escala, shake en error).
- **Confeti con la paleta de marca** al acertar / al terminar bien.
- Conteo animado de puntos (count-up).
- Indicador de racha "en llamas".
- Pulso del reloj en Contrarreloj cuando queda poco tiempo.
- Figuras geométricas Memphis flotando de fondo (decorativas).
- Respetar `prefers-reduced-motion` (degradar a transiciones simples).

## 10. Estructura de carpetas

```
app/
  layout.tsx
  page.tsx                  # home: selección de modo
  play/[mode]/page.tsx      # sesión de juego (client component)
  globals.css               # tema / paleta
lib/
  data/
    types.ts
    tournaments/1998.ts ... 2022.ts
    index.ts                # agrega y exporta todos los torneos
  engine/
    questionGenerators/     # un archivo por familia de generadores
    generateQuestion.ts     # selector + no-repetición
    gameSession.ts          # reducer (máquina de estados)
    scoring.ts
    rng.ts                  # RNG sembrado
    difficulty.ts           # lógica adaptativa
  modes/
    modes.ts                # las 6 GameMode
  storage/
    localStore.ts
components/
  ModeCard.tsx
  QuestionCard.tsx
  formats/
    MultipleChoice.tsx
    TrueFalse.tsx
    NumberInput.tsx
    OddOneOut.tsx
  Hud.tsx                   # puntos / reloj / vidas / racha
  ui/
    MemphisBackground.tsx
    Confetti.tsx
    Button.tsx
docs/superpowers/specs/     # este documento
```

## 11. Testing

Estrategia centrada en las funciones puras (alta cobertura, sin DOM):

- **Generadores:** toda pregunta generada tiene respuesta válida; opciones únicas y no vacías; la opción correcta existe; `number` tiene `numericAnswer` y `tolerance`; `difficulty` en rango.
- **Datos:** invariantes por torneo (campeón/subcampeón/tercero ∈ participantes; `numTeams` = `participants.length` cuando aplique; campos requeridos presentes).
- **Selector:** respeta el filtro de torneo; no devuelve `id` ya en el buffer de vistos.
- **Scoring:** base/velocidad/racha/cercanía calculan lo esperado en casos borde.
- **Reducer de sesión:** transiciones de estado correctas (acierto, error, sin vidas, tiempo agotado, cash-out).

Framework de test a decidir en el plan de implementación (Vitest recomendado por velocidad con TS/ESM).

## 12. Riesgos y notas

- **Exactitud de datos:** el valor del juego depende de hechos correctos; verificar cada torneo contra fuentes confiables.
- **Variedad de generadores:** con pocos generadores las preguntas se sienten repetitivas aunque los `id` difieran; apuntar a una variedad suficiente de plantillas por torneo.
- **Next.js 16:** leer `node_modules/next/dist/docs/` antes de implementar; la sesión de juego es client-side (`'use client'`).
- **`prefers-reduced-motion`:** todas las animaciones deben degradar limpiamente.
