# Penales en Multiplayer — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Penales como 5º juego de las salas multijugador (simultáneo, goles, muerte súbita), añadir la cabecera `← Inicio` al modo solo y un CTA de multijugador en su pantalla inicial.

**Architecture:** Extensiones quirúrgicas gated por `game === "penales"` sobre el motor host-autoritativo existente (`app/sala/[codigo]/jugar/page.tsx`): nueva `PenalesRound` + helper puro `penalesContinua` en `lib/multiplayer/rounds.ts` (testeados), tracking de tiros a partir de los broadcasts `ans` ya existentes (sin cambios de protocolo), y una `PenalesView` nueva en el dispatcher. Los 4 juegos actuales no cambian.

**Tech Stack:** Next.js 16 · React 19 · Supabase Realtime · Framer Motion · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-03-penales-multiplayer-design.md`

---

## Notas para quien implementa

- Rama de trabajo: continuar en `feat/penales-adivina-pais` (ya contiene el merge de origin/main con el sistema multijugador).
- ⚠️ **GIT SAFETY:** NUNCA `git reset` / `git checkout -- <file>` / `git restore` / `git stash`. Hay un `yarn.lock` sin trackear — ignorarlo. Solo `git add` los archivos de tu tarea.
- `@/*` → raíz. UTF-8 siempre (⚽ 🧤 ⚡ ✕ acentos). Leer cada archivo antes de editarlo.
- El motor de salas es compartido por 4 juegos en producción: cualquier cambio fuera de las ramas `game === "penales"` es una regresión.

## Mapa de archivos

```
lib/multiplayer/rounds.ts        # MODIFICAR: PenalesRound + buildRound('penales') + penalesContinua
lib/multiplayer/rounds.test.ts   # NUEVO: tests del caso penales + helper + no-regresión quiz
lib/games.ts                     # MODIFICAR: entrada 'penales' en GAMES
app/penales/page.tsx             # MODIFICAR: cabecera ← Inicio + CTA multijugador
app/sala/[codigo]/jugar/page.tsx # MODIFICAR: msFor, goles, muerte súbita, shots, PenalesView, labels
```

---

## Task 1: Rondas de penales + muerte súbita (`lib/multiplayer/rounds.ts`)

**Files:**
- Modify: `lib/multiplayer/rounds.ts`
- Test: `lib/multiplayer/rounds.test.ts` (nuevo)

- [ ] **Step 1: Escribir el test**

Create `lib/multiplayer/rounds.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildRound, penalesContinua, TOTAL_ROUNDS, PENALES_MAX_ROUNDS } from '@/lib/multiplayer/rounds';

describe('buildRound("penales")', () => {
  it('returns a valid penales round', () => {
    for (let i = 0; i < 10; i++) {
      const r = buildRound('penales');
      expect(r.kind).toBe('penales');
      if (r.kind !== 'penales') continue;
      expect(r.prompt.length).toBeGreaterThan(0);
      expect(r.options.length).toBe(4);
      expect(new Set(r.options).size).toBe(4);
      expect(r.answer).toBeGreaterThanOrEqual(0);
      expect(r.answer).toBeLessThan(4);
    }
  });

  it('quiz keeps returning options rounds (no regression)', () => {
    expect(buildRound('quiz').kind).toBe('options');
  });
});

describe('penalesContinua', () => {
  it('always continues during the first 5 rounds', () => {
    expect(penalesContinua([0, 0], 1)).toBe(true);
    expect(penalesContinua([3, 0], 4)).toBe(true);
  });
  it('ends after 5 rounds when there is a leader', () => {
    expect(penalesContinua([3, 2], TOTAL_ROUNDS)).toBe(false);
  });
  it('continues on a tie at the top (sudden death)', () => {
    expect(penalesContinua([3, 3], TOTAL_ROUNDS)).toBe(true);
    expect(penalesContinua([3, 3, 1], 7)).toBe(true);
  });
  it('stops at the safety cap', () => {
    expect(penalesContinua([4, 4], PENALES_MAX_ROUNDS)).toBe(false);
  });
  it('a single player ends after 5 rounds', () => {
    expect(penalesContinua([4], TOTAL_ROUNDS)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npx vitest run lib/multiplayer/rounds.test.ts`
Expected: FAIL — `penalesContinua` no existe / kind nunca es "penales".

- [ ] **Step 3: Implementar en `lib/multiplayer/rounds.ts`**

(a) Añadir el tipo tras `IncognitaRound` y extender la unión:
```ts
export interface PenalesRound {
  kind: "penales";
  prompt: string;
  sub?: string;
  options: string[];
  answer: number;
}
export type Round = OptionsRound | ConexionRound | IncognitaRound | PenalesRound;
```
(La línea `export type Round = ...` existente se reemplaza por esta.)

(b) Extraer el generador de pregunta-con-opciones (hoy inline en el caso quiz) a un helper, y usarlo en quiz y penales. El bloque a reemplazar en `buildRound` es EXACTAMENTE este (incluye la llave de cierre de `buildRound`):
```ts
  // quiz (por defecto): primera pregunta con opciones (no numérica).
  const rng = createRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  for (let i = 0; i < 25; i++) {
    const q = generateQuestion({ tournaments: TOURNAMENTS, targetDifficulty: 2, tournamentFilter: "all", seenIds: [], rng });
    if (q.format !== "number" && q.options && q.answerIndex != null) {
      return {
        kind: "options",
        prompt: q.prompt,
        sub: q.tournamentYear ? `Mundial ${q.tournamentYear}` : undefined,
        options: q.options,
        answer: q.answerIndex,
      };
    }
  }
  return { kind: "options", prompt: "—", options: ["A", "B", "C", "D"], answer: 0 };
}
```
y se reemplaza por este bloque COMPLETO (autocontenido, con todas sus llaves):
```ts
  if (game === "penales") {
    return { kind: "penales", ...pickOptionsQuestion() };
  }

  // quiz (por defecto): primera pregunta con opciones (no numérica).
  return { kind: "options", ...pickOptionsQuestion() };
}

// Pregunta de opción múltiple (no numérica) del motor de trivia, dificultad media.
function pickOptionsQuestion(): { prompt: string; sub?: string; options: string[]; answer: number } {
  const rng = createRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  for (let i = 0; i < 25; i++) {
    const q = generateQuestion({ tournaments: TOURNAMENTS, targetDifficulty: 2, tournamentFilter: "all", seenIds: [], rng });
    if (q.format !== "number" && q.options && q.answerIndex != null) {
      return {
        prompt: q.prompt,
        sub: q.tournamentYear ? `Mundial ${q.tournamentYear}` : undefined,
        options: q.options,
        answer: q.answerIndex,
      };
    }
  }
  return { prompt: "—", options: ["A", "B", "C", "D"], answer: 0 };
}
```

(c) Añadir al final del archivo (tras `scoreFor`):
```ts
export const PENALES_MAX_ROUNDS = 15;

// ¿Sigue la tanda de penales tras completar la ronda nextIdx-1?
// 5 rondas fijas; después, muerte súbita mientras haya empate en la cima (tope de seguridad).
export function penalesContinua(goles: number[], nextIdx: number): boolean {
  if (nextIdx < TOTAL_ROUNDS) return true;
  if (nextIdx >= PENALES_MAX_ROUNDS) return false;
  const sorted = [...goles].sort((a, b) => b - a);
  return sorted.length >= 2 && sorted[0] === sorted[1];
}
```

- [ ] **Step 4: Ejecutar para verlo pasar + suite completa**

Run: `npx vitest run lib/multiplayer/rounds.test.ts` → PASS (7 casos).
Run: `npm test` → PASS (todo verde; antes había 115, ahora 122).

- [ ] **Step 5: Commit**

```bash
git add lib/multiplayer/rounds.ts lib/multiplayer/rounds.test.ts
git commit -m "feat(multiplayer): add penales round type and sudden-death helper"
```

---

## Task 2: Registro del juego + mejoras del modo solo

**Files:**
- Modify: `lib/games.ts`
- Modify: `app/penales/page.tsx`

- [ ] **Step 1: Registrar Penales en `lib/games.ts`**

En el objeto `GAMES`, tras la entrada `"quien-es"`, añadir:
```ts
  penales: { nombre: "Penales Quiz", solo: "/penales", accent: "var(--color-red)" },
```

- [ ] **Step 2: Cabecera `← Inicio` en la pantalla de juego solo**

En `app/penales/page.tsx`:

(a) Añadir el import de lucide tras los imports existentes de framer-motion:
```ts
import { ArrowLeft } from "lucide-react";
```

(b) En el `return` final de `PenalesGame` (la pantalla con `<Marcador …>` y la tarjeta de pregunta), insertar como PRIMER hijo de `<main …>` (antes de `<MemphisBackground />` no — justo después de `<MemphisBackground />`):
```tsx
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-xs font-bold text-[var(--color-gray-light)]/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
      </div>
```

- [ ] **Step 3: CTA de multijugador en `LevelSelect`**

(a) Reemplazar el párrafo introductorio de `LevelSelect`:
de:
```tsx
      <p className="max-w-md text-center text-sm text-[var(--color-gray-light)]/80">
        Cada pregunta es un penal: acierta y es gol, falla y lo ataja el portero. Gana la tanda al
        mejor de 5 contra la IA. Empate = muerte súbita.
      </p>
```
a:
```tsx
      <p className="max-w-md text-center text-sm text-[var(--color-gray-light)]/80">
        Cada pregunta es un penal: acierta y es gol, falla y lo ataja el portero. Gana la tanda al
        mejor de 5. Empate = muerte súbita. Elige un nivel para retar a la IA, o juega contra tus
        amigos en multijugador.
      </p>
```

(b) Tras el cierre del `<div className="grid w-full max-w-md gap-3">…</div>` (la lista de niveles) y antes del `<Link href="/" …>Volver al inicio</Link>`, añadir:
```tsx
      <Link
        href="/multijugador"
        className="flex w-full max-w-md items-center justify-between rounded-2xl bg-[var(--color-green)] px-5 py-4 font-black text-[var(--color-navy-deep)] shadow-lg"
      >
        <span>👥 Jugar de 2 o más</span>
        <span className="text-xs font-bold uppercase">Multijugador →</span>
      </Link>
```

- [ ] **Step 4: Verificar build**

Run: `npm run build` → éxito.

- [ ] **Step 5: Commit**

```bash
git add lib/games.ts app/penales/page.tsx
git commit -m "feat: register penales in games and add home/multiplayer controls to solo mode"
```

---

## Task 3: Motor de salas — integración de Penales

**Files:**
- Modify: `app/sala/[codigo]/jugar/page.tsx`

Todos los cambios gated por `game === "penales"` o ramas nuevas; NO tocar el comportamiento de options/conexion/incognita. Leer el archivo completo antes de editar.

- [ ] **Step 1: Imports**

(a) Línea de imports de rounds — añadir `penalesContinua`:
```ts
import { buildRound, penalesContinua, scoreFor, TOTAL_ROUNDS, type Round } from "@/lib/multiplayer/rounds";
```
(b) Import de useRoom — añadir el tipo `Jugador`:
```ts
import { useRoom, type Jugador } from "@/lib/multiplayer/useRoom";
```

- [ ] **Step 2: `msFor` con penales (20s)**

Reemplazar:
```ts
const msFor = (r: Round) => (r.kind === "incognita" ? 60000 : r.kind === "conexion" ? 25000 : 15000);
```
por:
```ts
const msFor = (r: Round) => (r.kind === "incognita" ? 60000 : r.kind === "conexion" ? 25000 : r.kind === "penales" ? 20000 : 15000);
```

- [ ] **Step 3: Estado de tiros**

Tras `const [myDone, setMyDone] = useState(false);` añadir:
```ts
  const [shots, setShots] = useState<Record<string, boolean[]>>({});
```
y junto a los demás refs (tras `const startedRef = useRef(false);`):
```ts
  const shotsRef = useRef<Record<string, boolean[]>>({});
```

- [ ] **Step 4: `hostReveal` con muerte súbita**

Reemplazar el cuerpo del `setTimeout` de `hostReveal`:
de:
```ts
      revealTimer.current = setTimeout(() => {
        if (idx + 1 < TOTAL_ROUNDS) startRound(idx + 1);
        else send("end", { scores: { ...hostScoresRef.current } });
      }, REVEAL_MS);
```
a:
```ts
      revealTimer.current = setTimeout(() => {
        const continua =
          game === "penales"
            ? penalesContinua(
                playersRef.current.map((pl) => hostScoresRef.current[String(pl.id)] ?? 0),
                idx + 1,
              )
            : idx + 1 < TOTAL_ROUNDS;
        if (continua) startRound(idx + 1);
        else send("end", { scores: { ...hostScoresRef.current } });
      }, REVEAL_MS);
```
y actualizar las deps del `useCallback` de `[send, startRound]` a `[game, send, startRound]`.

- [ ] **Step 5: Tracking de tiros en el handler de eventos**

(a) En la rama `} else if (type === "ans") {`, justo después de `answeredRef.current.add(String(p.id));`, añadir:
```ts
        const shooterId = String(p.id);
        const arr = [...(shotsRef.current[shooterId] ?? [])];
        arr[Number(p.idx)] = Boolean(p.correct);
        shotsRef.current = { ...shotsRef.current, [shooterId]: arr };
        setShots(shotsRef.current);
```
(b) En la rama `} else if (type === "reveal") {`, justo después de `setScores((p.scores as Record<string, number>) || {});`, añadir (marca como atajado a quien no tiró):
```ts
        const rIdx = Number(p.idx);
        for (const pl of playersRef.current) {
          const id = String(pl.id);
          const arr = [...(shotsRef.current[id] ?? [])];
          if (arr[rIdx] === undefined) {
            arr[rIdx] = false;
            shotsRef.current = { ...shotsRef.current, [id]: arr };
          }
        }
        setShots(shotsRef.current);
```

- [ ] **Step 6: `responder` con goles**

Reemplazar la línea de `pts` dentro de `responder`:
de:
```ts
      const pts = scoreFor(correct, Date.now() - startTsRef.current, msRef.current);
```
a:
```ts
      const pts = game === "penales" ? (correct ? 1 : 0) : scoreFor(correct, Date.now() - startTsRef.current, msRef.current);
```
y actualizar las deps del `useCallback` de `[myDone, myId, send]` a `[game, myDone, myId, send]`.

- [ ] **Step 7: Etiqueta de cabecera y podio**

(a) Reemplazar el `<span>` de la cabecera:
de:
```tsx
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {GAMES[game]?.nombre} · Ronda {Math.max(0, roundIdx) + 1}/{TOTAL_ROUNDS}
        </span>
```
a:
```tsx
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          {game === "penales"
            ? `${GAMES[game]?.nombre} · Penal ${Math.max(0, roundIdx) + 1}${roundIdx >= TOTAL_ROUNDS ? " · ⚡ Muerte súbita" : ""}`
            : `${GAMES[game]?.nombre} · Ronda ${Math.max(0, roundIdx) + 1}/${TOTAL_ROUNDS}`}
        </span>
```
(b) En la pantalla final, reemplazar:
```tsx
              <span className="ml-auto font-black tabular-nums text-[var(--color-green)]">{p.pts}</span>
```
por:
```tsx
              <span className="ml-auto font-black tabular-nums text-[var(--color-green)]">
                {p.pts}
                {game === "penales" ? " ⚽" : ""}
              </span>
```

- [ ] **Step 8: Dispatcher y `PenalesView`**

(a) Reemplazar la llamada a `<RoundView …/>`:
```tsx
        <RoundView round={round} phase={phase} myDone={myDone} onResult={responder} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />
```
(b) Reemplazar la función `RoundView` por:
```tsx
function RoundView({ round, phase, myDone, onResult, players, shots, roundIdx, myId }: { round: Round; phase: Phase; myDone: boolean; onResult: (c: boolean) => void; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  if (round.kind === "penales") return <PenalesView round={round} phase={phase} myDone={myDone} onResult={onResult} players={players} shots={shots} roundIdx={roundIdx} myId={myId} />;
  if (round.kind === "options") return <OptionsView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  if (round.kind === "conexion") return <ConexionView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
  return <IncognitaView round={round} phase={phase} myDone={myDone} onResult={onResult} />;
}
```
(c) Añadir `PenalesView` justo después de `RoundView` (antes de `OptionsView`):
```tsx
function PenalesView({ round, phase, myDone, onResult, players, shots, roundIdx, myId }: { round: Extract<Round, { kind: "penales" }>; phase: Phase; myDone: boolean; onResult: (c: boolean) => void; players: Jugador[]; shots: Record<string, boolean[]>; roundIdx: number; myId: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const reveal = phase === "reveal";
  const totalDots = Math.max(TOTAL_ROUNDS, roundIdx + 1);
  const click = (i: number) => {
    if (myDone || reveal) return;
    setPick(i);
    onResult(i === round.answer);
  };
  const myGoal = pick !== null && pick === round.answer;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {/* Marcador de la tanda */}
      <div className="flex w-full flex-col gap-2 rounded-2xl bg-[var(--color-navy)] p-3 ring-1 ring-white/10">
        {roundIdx >= TOTAL_ROUNDS && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-red)]">⚡ Muerte súbita</p>
        )}
        {players.map((pl) => (
          <div key={pl.id} className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-[var(--color-navy-deep)]" style={{ backgroundColor: pl.color }}>
              {iniciales(pl.nombre)}
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: totalDots }).map((_, i) => {
                const shot = shots[pl.id]?.[i];
                return (
                  <span
                    key={i}
                    className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: shot === undefined ? "rgba(255,255,255,0.12)" : shot ? "var(--color-green)" : "var(--color-red)" }}
                  >
                    {shot === undefined ? "" : shot ? "⚽" : "✕"}
                  </span>
                );
              })}
            </div>
            {pl.id === myId && <span className="ml-auto text-[9px] font-bold uppercase text-[var(--color-gray-light)]/60">Tú</span>}
          </div>
        ))}
      </div>

      {round.sub && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{round.sub}</span>}
      <h2 className="text-center text-xl font-black leading-tight">{round.prompt}</h2>
      <div className="grid w-full gap-2.5">
        {round.options.map((op, i) => {
          let bg = "rgba(255,255,255,0.1)";
          let fg = "#fff";
          if (reveal && i === round.answer) { bg = "var(--color-green)"; fg = "var(--color-navy-deep)"; }
          else if (reveal && i === pick) { bg = "var(--color-red)"; }
          return (
            <motion.button key={i} onClick={() => click(i)} disabled={myDone || reveal} whileTap={!myDone && !reveal ? { scale: 0.97 } : undefined} style={{ backgroundColor: bg, color: fg }} className="rounded-2xl px-5 py-3 text-left font-extrabold ring-1 ring-white/10 disabled:opacity-90">
              {op}
            </motion.button>
          );
        })}
      </div>
      {reveal && pick !== null && (
        <p className="text-2xl font-black uppercase italic" style={{ color: myGoal ? "var(--color-green)" : "var(--color-red)" }}>
          {myGoal ? "⚽ ¡GOOOL!" : "🧤 ¡Atajado!"}
        </p>
      )}
      {myDone && phase === "play" && <p className="text-sm font-bold text-[var(--color-gray-light)]/70">¡Penal tirado! esperando…</p>}
    </div>
  );
}
```
(`iniciales` ya está importado en este archivo desde `@/lib/perfil`.)

- [ ] **Step 9: Verificar build y suite**

Run: `npm run build` → éxito.
Run: `npm test` → PASS (122).

- [ ] **Step 10: Commit**

```bash
git add "app/sala/[codigo]/jugar/page.tsx"
git commit -m "feat(multiplayer): penales match view with goals and sudden death"
```

---

## Task 4: Integración final

- [ ] **Step 1:** `npm test` → PASS (122).
- [ ] **Step 2:** `npm run lint` → sin errores.
- [ ] **Step 3:** `npm run build` → éxito.
- [ ] **Step 4:** Smoke runtime: servir build (`npx next start -p 3106`) y verificar 200 + contenido en `/penales` (CTA multijugador presente), `/multijugador`, `/sala/TEST` (lobby lista "Penales Quiz" — requiere envs de Supabase para el realtime; si no están, basta el 200 del shell). Apagar el server.
- [ ] **Step 5:** Commit final si hubo ajustes.

## Cobertura del spec

- Registro en salas (3.1) → Task 2. Ronda + helper (3.2) → Task 1. Motor: msFor/goles/muerte súbita/shots/labels/PenalesView/podio (3.3) → Task 3. Solo: cabecera Inicio + CTA multijugador (3.4) → Task 2. Testing (4) → Tasks 1 y 4.
