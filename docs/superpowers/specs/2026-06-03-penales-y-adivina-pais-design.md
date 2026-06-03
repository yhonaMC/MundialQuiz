# Penales Quiz + Adivina el País — Documento de Diseño

**Fecha:** 2026-06-03
**Estado:** Aprobado para planificación
**Base:** MundialQuiz existente (motor de trivia + hub de juegos)

## 1. Resumen

Dos incorporaciones:

1. **Adivina el País por el Jugador** — preguntas "¿Para qué selección jugó {jugador}?" generadas desde la base de jugadores existente (`lib/db/players.ts`, ~1000 jugadores). Vive como **modo nuevo del quiz** (`adivina-pais`) y además sus preguntas **se mezclan en el pool general** de los otros modos.
2. **Penales Quiz** — juego independiente del hub: cada pregunta es un penal (acierto = gol, fallo = penal errado), tanda al mejor de 5 **contra la IA** con reglas reales (final anticipado + muerte súbita) y 3 niveles de dificultad.

### Decisiones tomadas en brainstorming
- Penales: **solo contra la IA** por ahora (2-jugadores/online queda para una fase futura con backend).
- Penales: reglas reales — **final anticipado** cuando la diferencia es insalvable y **muerte súbita** en empate tras 5.
- IA seleccionable: **Fácil (50%) / Normal (65%) / Difícil (80%)** de probabilidad de gol por tiro; el nivel también define la dificultad de tus preguntas.
- Penales usa el **pool completo** de generadores de trivia (incluidos los nuevos de jugador→país).
- Adivina el País: **modo propio + inyección al pool general**.
- Distractores de jugador→país: **misma confederación**; dificultad por **fama del jugador**.
- En muerte súbita: la IA mantiene su probabilidad; tus preguntas suben **+1 de dificultad** (tope 5).
- Penales es **juego independiente** (`lib/penales/` + `app/penales/`), siguiendo el patrón del hub (Incógnita, Conexión, Quién-es). No se toca el `sessionReducer` compartido.

## 2. Parte A — Adivina el País por el Jugador

### 2.1 Generadores nuevos

Archivo nuevo `lib/engine/questionGenerators/playerCountry.ts`, exportando **dos** generadores (mismo esquema `Generator` existente: `{ id, difficulty, formats, build(t, all, rng) }`), registrados en `GENERATORS` (en `index.ts`):

| id | dificultad | población |
|----|-----------|-----------|
| `player-country` | 2 | jugadores famosos: `campeon === true` **o** `mundiales.length >= 3` |
| `player-country-hard` | 4 | el resto (1–2 mundiales, no campeones) |

**Comportamiento de `build(t, all, rng)`:**
- Filtra jugadores de su población **cuyo `mundiales[]` incluya `t.year`** → respeta los filtros de torneo de los modos (Por Mundial, Maratón). Si no hay ninguno para ese año (caso borde), usa la población completa.
- Solo considera jugadores con `paisEs` no vacío.
- **Prompt:** `¿Para qué selección jugó {nombre} en los Mundiales?` (tiempo pasado: vale para activos y retirados).
- **Opciones:** `paisEs` correcto + 3 países distintos de la **misma `confederacion`**, derivados agrupando `paisEs` por `confederacion` sobre toda la DB de jugadores (helper `countriesByConfederation()`, calculado una vez a nivel de módulo). Si la confederación tiene < 4 países en la DB (p. ej. OFC), completa con `NATIONAL_TEAMS` (excluyendo el correcto y duplicados).
- **id:** `player-country:{player.id}` / `player-country-hard:{player.id}` → no-repetición por jugador vía el buffer `seenIds` existente.
- **explanation:** `{nombre} disputó {n} Mundial(es) con {paisEs} ({años}).`
- `tournamentYear: t.year`, `tags: ['jugador', 'país']`, formato `multiple-choice`.

### 2.2 Extensión del selector: `generatorIds`

Para que un modo pueda restringirse a generadores concretos:

- `GameMode` gana campo opcional **`generatorIds?: string[]`**.
- `SelectOptions` (en `generateQuestion.ts`) gana **`generatorIds?: string[]`**.
- `generatorsForDifficulty` filtra primero `GENERATORS` por esos ids (si el campo viene); luego aplica la ventana de dificultad ±1 con ensanche progresivo, como hoy.
- `useGameSession` pasa `mode.generatorIds` al selector.
- Modos sin el campo → pool completo (sin cambios de comportamiento). Así, los generadores nuevos **entran automáticamente** a Contrarreloj, Supervivencia, Escalera, Maratón, Experto y Por Mundial.

### 2.3 Modo nuevo `adivina-pais`

Config en `MODES`:

```ts
{
  id: 'adivina-pais',
  name: 'Adivina el País',
  icon: <clave del mapa de iconos existente>,   // añadir la clave nueva al mapa que usa ModeCard
  description: '¿Para qué selección jugó? Demuestra cuánto conoces a los mundialistas.',
  tournamentFilter: 'all',
  difficultyCurve: 'adaptive',
  questionCount: 10,
  generatorIds: ['player-country', 'player-country-hard'],
  scoring: { base: 100, speedBonusMax: 0, streakMultiplierStep: 0.1 },
}
```

> Nota de implementación: los iconos de modo ya no son emojis sino claves semánticas (`trophy`, `timer`, …). El plan debe localizar el componente que mapea clave→icono y añadir la entrada nueva.

El modo aparece automáticamente en la selección de modos de `/quiz` — no requiere ruta nueva.

## 3. Parte B — Penales Quiz

### 3.1 Estructura (patrón del hub)

```
lib/penales/
  ai.ts            # IA: probabilidad de gol y dificultad de preguntas por nivel
  shootout.ts      # reducer puro de la tanda (máquina de estados) + tests
hooks/
  usePenales.ts    # une shootout + generateQuestion + ai + persistencia
components/penales/
  Marcador.tsx     # tablero de la tanda (círculos ⚽/❌/○ por lado, indicador de muerte súbita)
app/penales/
  page.tsx         # selector de nivel → juego → resultado
```

### 3.2 IA (`lib/penales/ai.ts`)

```ts
export type Nivel = 'facil' | 'normal' | 'dificil';

export const AI_GOAL_PROBABILITY: Record<Nivel, number> = {
  facil: 0.5,
  normal: 0.65,
  dificil: 0.8,
};

export const NIVEL_DIFFICULTY: Record<Nivel, [number, number]> = {
  facil: [1, 2],
  normal: [2, 3],
  dificil: [3, 5],
};

export function aiShoots(nivel: Nivel, rng: Rng): boolean;   // rng.next() < probabilidad
export function questionDifficulty(nivel: Nivel, suddenDeath: boolean, rng: Rng): number;
// entero aleatorio dentro del rango del nivel; en muerte súbita +1 (tope 5)
```

Determinista con el RNG sembrado existente → testeable.

### 3.3 Máquina de estados (`lib/penales/shootout.ts`)

Reducer **puro** (sin generación de preguntas ni RNG dentro; el hook inyecta los resultados):

```ts
export type ShootoutPhase = 'idle' | 'question' | 'player-feedback' | 'ai-feedback' | 'gameover';

export interface ShootoutState {
  phase: ShootoutPhase;
  round: number;                 // 1-based; >5 = muerte súbita
  playerShots: boolean[];        // resultado de cada tiro del jugador
  aiShots: boolean[];            // resultado de cada tiro de la IA
  suddenDeath: boolean;          // round > 5
  winner: 'player' | 'ai' | null;
}

export type ShootoutAction =
  | { type: 'START' }
  | { type: 'PLAYER_SHOT'; goal: boolean }   // question → player-feedback (evalúa fin)
  | { type: 'AI_SHOT'; goal: boolean }       // player-feedback → ai-feedback (evalúa fin); ignorada si winner ya está fijado
  | { type: 'NEXT_ROUND' };                  // con winner fijado (desde cualquier feedback) → gameover; si no, ai-feedback → question, round+1

export function shootoutReducer(state: ShootoutState, action: ShootoutAction): ShootoutState;
export const initialShootoutState: ShootoutState;
export function goals(shots: boolean[]): number;             // tiros convertidos
```

**Orden de tiro:** el jugador siempre tira primero en cada ronda; luego la IA.

**Regla de decisión (se evalúa tras CADA tiro):**
- Fase regular (rondas 1–5): `remaining(side) = 5 - shots(side).length`. Gana un lado si `goles(lado) > goles(rival) + remaining(rival)`. (Ej.: jugador 3, IA 0 con 2 tiros restantes de IA → 0+2 < 3 → gana el jugador; final anticipado.)
- Si tras 5 tiros de cada lado hay empate → `suddenDeath = true` y se continúa por rondas.
- **Muerte súbita:** tras el tiro de la IA de cada ronda (ambos lados con el mismo nº de tiros), si los goles difieren → gana quien tenga más. Nunca se decide tras el tiro del jugador solamente (la IA siempre completa la ronda).
- Al decidirse: `winner` se fija y `phase = 'gameover'` **después** de mostrar el feedback del tiro decisivo (el reducer fija `winner` pero permanece en la fase de feedback; `NEXT_ROUND` con `winner != null` pasa a `gameover`). Esto deja a la UI animar el tiro decisivo antes de la pantalla final.
- Si el tiro **del jugador** ya decide (p. ej. su 5º gol hace insalvable la diferencia), la IA **no tira**: con `winner` fijado, `AI_SHOT` se ignora y el hook despacha `NEXT_ROUND` desde `player-feedback` directamente a `gameover`.

### 3.4 Hook (`hooks/usePenales.ts`)

- Estado: `useReducer(shootoutReducer)` + pregunta actual + nivel + RNG sembrado (semilla cliente post-mount, mismo patrón que `/play`).
- Por ronda: genera pregunta con `generateQuestion({ tournaments: TOURNAMENTS, targetDifficulty: questionDifficulty(nivel, suddenDeath, rng), tournamentFilter: 'all', seenIds, rng })` (pool completo).
- `answer(raw)`: evalúa correcto/incorrecto con la misma lógica de formatos que `useGameSession` (índice u `numericCloseness > 0`) → `PLAYER_SHOT { goal }`.
- Tras el feedback del jugador (botón "Tira la IA" o auto tras animación): `AI_SHOT { goal: aiShoots(nivel, rng) }`.
- No-repetición: `seenIds` de `loadData()` + locales; `addSeenIds` al terminar.
- Persistencia: `recordPenales(nivel, won)` al terminar.

### 3.5 Persistencia (extensión mínima de `localStore`)

`SaveData` gana campo:

```ts
penales: Record<Nivel, { ganados: number; perdidos: number }>;
```

- `defaultSaveData()` lo inicializa en ceros; el merge existente de `loadData` da compatibilidad con datos guardados antiguos (sin migración).
- Nueva función `recordPenales(nivel: Nivel, won: boolean, storage?): SaveData`.
- Tests nuevos en `localStore.test.ts`.

### 3.6 UI (`app/penales/page.tsx` + `components/penales/`)

1. **Selector de nivel:** 3 tarjetas (Fácil/Normal/Difícil) con la probabilidad de la IA y el récord ganados-perdidos del nivel (de `loadData()`).
2. **Juego:**
   - `Marcador`: dos filas de círculos (Tú / IA). Regular: 5 círculos por lado (⚽ gol, ❌ fallo, ○ pendiente). En muerte súbita se añaden círculos por ronda + indicador "MUERTE SÚBITA".
   - Pregunta: reutiliza los componentes de formato existentes (`MultipleChoice`, `TrueFalse`, `NumberInput`, `OddOneOut`) — **no** se reutiliza `QuestionCard` (su feedback de puntos/racha no aplica); un contenedor propio muestra feedback "⚽ ¡GOOOL!" / "🧤 ¡Atajado!" con Framer Motion y la explicación de la pregunta.
   - Tiro de la IA: animación breve (balón + resultado) antes de pasar de ronda.
3. **Resultado:** marcador final, `Confetti` si ganas, récord actualizado, "Jugar de nuevo" / "Inicio".
4. Estética Fiesta Memphis (paleta y `MemphisBackground` existentes). `prefers-reduced-motion` ya cubierto globalmente.

### 3.7 Hub

Añadir una `GameCard` de Penales en el home (`/`) apuntando a `/penales`, siguiendo las props del componente existente (`title`, `subtitle`, `visual`, `href`, accent).

## 4. Testing

- **`lib/penales/shootout.test.ts`:** transiciones de fase; final anticipado exacto (3-0 con 2 restantes termina; 3-1 con 2 restantes NO termina); empate 5-5 activa muerte súbita; muerte súbita decide solo tras ronda completa; el tiro decisivo mantiene la fase de feedback y `NEXT_ROUND` lleva a gameover; `goals()` cuenta bien.
- **`lib/penales/ai.test.ts`:** con RNG sembrado, `aiShoots` respeta umbrales por nivel; `questionDifficulty` cae dentro del rango del nivel y aplica +1 (tope 5) en muerte súbita.
- **`lib/engine/questionGenerators/playerCountry.test.ts`:** pregunta válida (4 opciones únicas, respuesta correcta); distractores de la misma confederación (cuando hay suficientes); respeta el filtro de torneo (jugador disputó ese mundial); ids únicos por jugador; ambas poblaciones no vacías.
- **`generateQuestion.test.ts`:** caso nuevo — `generatorIds` restringe los generadores usados.
- **`modes.test.ts`:** actualizar a 7 modos; `adivina-pais` tiene `generatorIds` correctos.
- **`localStore.test.ts`:** `recordPenales` acumula por nivel; datos antiguos sin `penales` cargan con defaults.

## 5. Riesgos y notas

- **Datos de jugadores:** la DB es auto-generada; los generadores deben tolerar `paisEs` vacío o poblaciones pequeñas (filtros defensivos + fallbacks ya descritos).
- **`mundiales` incluye 2026:** los filtros por torneo solo usan los años del dataset de torneos (1998–2022); el filtro `t.year` ya lo garantiza. Para el caso "población completa" (fallback), no importa.
- **No tocar el motor compartido:** `sessionReducer`/`useGameSession` solo reciben el passthrough de `generatorIds`; nada más cambia para los 6 modos existentes.
- **Icono del modo nuevo:** localizar el mapa clave→icono actual antes de elegir la clave (el plan lo verifica).
- **El plan debe re-verificar el estado real del código** (el proyecto evolucionó desde el MVP): rutas exactas de `lib/db/queries.ts`, props reales de `GameCard`, y el render actual de la selección de modos en `/quiz`.
