# Penales en Multiplayer + mejoras al modo solo — Documento de Diseño

**Fecha:** 2026-06-03
**Estado:** Aprobado para planificación
**Base:** rama `feat/penales-adivina-pais` con `origin/main` mergeado (lobby Supabase Realtime + partidas sincronizadas de 4 juegos).

## 1. Resumen

Tres entregas:
1. **Penales como 5º juego de las salas multijugador** (2+ jugadores, simultáneo).
2. **Cabecera `← Inicio`** en el modo solo de Penales durante la partida (paridad con quiz/conexión/quién-es).
3. **Selector Solo/Multijugador** en la pantalla inicial de Penales: "solo" → vs IA (flujo actual de niveles); "multijugador" → enlace a `/multijugador`.

### Decisiones de brainstorming
- **Mecánica 2P: simultánea.** Cada ronda = 1 pregunta que TODOS los jugadores de la sala responden a la vez (límite 20s). Acierto = gol ⚽; fallo o no responder = atajado 🧤. Tras 5 rondas gana quien tenga más goles; **empate en la cima → muerte súbita** (rondas extra hasta que haya diferencia; tope de seguridad 15 rondas). Funciona con N jugadores.
- **Dificultad multiplayer: fija tipo Normal** (preguntas dificultad 2, como el quiz multijugador). El selector Fácil/Normal/Difícil queda solo para vs IA.
- El motor host-autoritativo existente se extiende **quirúrgicamente**, sin cambiar el comportamiento de los 4 juegos actuales.

## 2. Arquitectura existente (verificada)

- **Registro:** `lib/games.ts` → `GAMES: Record<string, GameInfo>` (`{ nombre, solo, accent }`). El lobby (`app/sala/[codigo]/page.tsx`) lista los juegos desde ahí.
- **Transporte:** Supabase Realtime, canal `sala:{codigo}` (presence + broadcast) vía `lib/multiplayer/useRoom.ts`. Eventos: `select`, `start`, `round`, `ans`, `reveal`, `end`.
- **Motor de partida:** `app/sala/[codigo]/jugar/page.tsx`. El host genera cada ronda (`buildRound(game)` en `lib/multiplayer/rounds.ts`), la difunde (`round`), los jugadores responden (`ans` con `{idx, id, correct, pts}` — broadcast que TODOS reciben), el host revela (`reveal` con scores) y tras `TOTAL_ROUNDS=5` envía `end`.
- **Solo-mode back control:** los otros juegos muestran `<ArrowLeft /> Inicio` en una cabecera durante la partida (p. ej. `app/quiz/page.tsx:25`). Penales no lo tiene.

## 3. Cambios

### 3.1 `lib/games.ts`
```ts
penales: { nombre: "Penales Quiz", solo: "/penales", accent: "var(--color-red)" },
```
Con esto el juego aparece en el selector de la sala y en cualquier UI que itere `GAMES`. (No se implementa pre-selección del juego al llegar desde `/penales`; el host lo elige en la sala.)

### 3.2 `lib/multiplayer/rounds.ts`
- Nuevo tipo:
```ts
export interface PenalesRound {
  kind: "penales";
  prompt: string;
  sub?: string;          // p.ej. "Mundial 2010"
  options: string[];
  answer: number;
}
```
- `Round = OptionsRound | ConexionRound | IncognitaRound | PenalesRound`.
- `buildRound("penales")`: igual que el caso quiz (pregunta no numérica con opciones, `targetDifficulty: 2`) pero con `kind: "penales"`.
- Constante y helper **puro** (testeado) para la muerte súbita:
```ts
export const PENALES_MAX_ROUNDS = 15;
// ¿Sigue la tanda tras la ronda nextIdx-1? 5 rondas fijas; después, solo si hay empate en la cima.
export function penalesContinua(goles: number[], nextIdx: number): boolean {
  if (nextIdx < TOTAL_ROUNDS) return true;
  if (nextIdx >= PENALES_MAX_ROUNDS) return false;
  const sorted = [...goles].sort((a, b) => b - a);
  return sorted.length >= 2 && sorted[0] === sorted[1];
}
```

### 3.3 Motor (`app/sala/[codigo]/jugar/page.tsx`) — extensiones gated por `game === "penales"`
1. `msFor`: ronda penales = **20000 ms**.
2. `responder`: puntos penales = `correct ? 1 : 0` (goles); los demás juegos siguen con `scoreFor`.
3. `hostReveal`: al decidir si continúa, penales usa `penalesContinua(goles, idx + 1)` con `goles = playersRef.map(p => hostScores[p.id] ?? 0)`; los demás juegos mantienen `idx + 1 < TOTAL_ROUNDS`.
4. **Tracking de tiros para el marcador:** todos los clientes reciben los `ans`; se acumula `shots: Record<playerId, boolean[]>` (posición = idx de ronda). Al llegar `reveal`, los jugadores sin tiro registrado en esa ronda se marcan `false` (no respondió = atajado).
5. **Cabecera:** para penales muestra `Penal {n}` y el badge "⚡ Muerte súbita" cuando `roundIdx >= 5` (en vez de `Ronda n/5`).
6. **`PenalesView`** en el dispatcher `RoundView`: marcador de tanda (filas por jugador con dots ⚽/🧤/○ por ronda, estilo del `Marcador` solo) + pregunta y opciones (interacción idéntica a `OptionsView`) + en reveal, feedback propio "⚽ ¡GOOOL!" / "🧤 ¡Atajado!".
7. **Pantalla final:** para penales los números del ranking se muestran como goles (`N ⚽`).

### 3.4 Modo solo (`app/penales/page.tsx`)
1. **Cabecera `← Inicio`** (ArrowLeft de lucide, mismo estilo que quiz) en la pantalla de juego (`PenalesGame`).
2. **`LevelSelect`** gana una tarjeta/CTA "👥 Jugar de 2 o más — Multijugador" → `Link` a `/multijugador`, debajo de los niveles. El texto introductorio aclara: niveles = vs IA.

## 4. Testing

- `lib/multiplayer/rounds.test.ts` (nuevo):
  - `buildRound("penales")` → `kind: "penales"`, 4 opciones únicas, `answer` válido, prompt no vacío.
  - `penalesContinua`: `(cualquier, <5)` → true; `([3,2], 5)` → false; `([3,3], 5)` → true; `([3,3,1], 7)` → true; `([4,4], 15)` → false (tope); `([4], 5)` → false (un jugador).
  - `buildRound("quiz")` sigue devolviendo `kind: "options"` (sin regresión).
- Motor y vistas: verificación por `npm run build` + smoke manual (los 4 juegos existentes no cambian de comportamiento: cambios gated).

## 5. Riesgos y notas

- **No romper los 4 juegos:** todos los cambios del motor están condicionados a `game === "penales"`; `msFor`/`RoundView` añaden ramas nuevas sin tocar las existentes.
- **Jugador que no responde** = atajado (comportamiento natural del timeout del host + marcado en reveal).
- **Salas de 1 jugador:** `penalesContinua` devuelve false tras 5 rondas (no hay con quién empatar).
- **Supabase:** requiere `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` ya configuradas (el sistema existente las usa; sin ellas el lobby ya muestra su propio fallback).
