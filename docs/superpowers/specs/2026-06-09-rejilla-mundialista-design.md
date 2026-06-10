# Rejilla Mundialista — Documento de Diseño

**Fecha:** 2026-06-09
**Estado:** Aprobado para planificación
**Base:** MundialQuiz/JuegaMundial existente (hub de juegos + BD unificada `lib/db/`)

## 1. Resumen

**Rejilla Mundialista** es un juego nuevo del hub, de **recall activo** (no de reconocimiento): una grilla **3×3** donde cada fila y cada columna llevan un **criterio** (selección, posición, confederación, "jugó el Mundial X", campeón, década, etc.). En cada celda el jugador **escribe** (con autocompletado) a un mundialista que cumpla **los dos criterios** que se cruzan. Inspirado en *Immaculate Grid*.

Es el primer juego del hub que obliga a **producir nombres de memoria** en vez de elegir entre opciones o reconocer una foto — ahí está su dificultad, y por eso complementa a los 5 juegos actuales (Quiz, Incógnita, Conexión, ¿Quién es?, Penales) sin solaparse con ninguno.

**Stack/encaje:** mismo patrón de "juego independiente del hub" que Penales/Conexión (`lib/rejilla/` + `hooks/useRejilla.ts` + `components/rejilla/` + `app/rejilla/`). No toca el motor de trivia (`sessionReducer`, `generateQuestion`) ni el multijugador. Estética Fiesta Memphis. UI en español.

> ⚠️ Next.js 16.2.7 tiene cambios importantes: leer `node_modules/next/dist/docs/` antes de escribir código de Next (la página es client-side, `'use client'`). Ver `AGENTS.md`.

### Decisiones tomadas en brainstorming
- **Mecánica clásica "difícil":** **9 intentos, uno por celda**. Eliges celda → buscas jugador → confirmas. Si cumple, se coloca (verde + foto); si no, la celda queda marcada (roja) y **no se reintenta**. Tensión real, como el original.
- **Sin repetir jugador** dentro de una misma grilla.
- **Dos modos:** **Diario** (misma grilla para todos hoy, determinista, compartible) y **Práctica** (grilla nueva cada vez, rejugable). Mismo patrón que la Incógnita (`lib/incognita/daily.ts`).
- **Puntuación en dos capas** (ver §6 y §7):
  - **Fase 1 — escasez local:** una celda vale más cuantos **menos jugadores de la BD** la cumplen. 100% local, offline, determinista, **sin cold-start**. Es la puntuación oficial desde el día 1.
  - **Fase 2 — rareza social (Supabase), opcional y NO bloqueante:** muestra *"solo el 8 % eligió a este jugador"* como dato de color **después** de acertar (como el Immaculate Grid real). Si Supabase no está disponible o aún no hay datos, el juego funciona perfecto con la Fase 1.
- **Input:** buscador con **autocompletado de jugadores** (nuevo), que resuelve el texto a un `Player.id` concreto → la validación de celda es exacta y sin ambigüedad de apellidos repetidos.
- **Pool:** los **1.637 jugadores** de la BD (no solo los que tienen foto). Si el acierto no tiene foto, se muestra inicial/placeholder.

## 2. Mecánica y reglas

1. La grilla tiene 3 **criterios de fila** (eje vertical) y 3 **criterios de columna** (eje horizontal) → 9 celdas.
2. El jugador toca una celda libre, escribe en el buscador y elige un jugador de las sugerencias.
3. **Validación:** correcto si `criterioFila.test(player) && criterioColumna.test(player)` **y** el jugador no se usó ya en la grilla.
4. **Acierto:** la celda muestra la **foto** (o inicial) y nombre del jugador, en verde; suma su puntuación de celda (§6).
5. **Fallo:** la celda se marca en rojo con una ✕ y **queda bloqueada** (gastaste su único intento).
6. La partida termina cuando las 9 celdas están resueltas o bloqueadas (≤ 9 intentos). Resultado: **N/9** + puntuación total.
7. **9/9** otorga el sello **"Rejilla Perfecta"** + bonus de puntuación.

## 3. Criterios (`lib/rejilla/criterios.ts`)

Todos derivables de `Player` sin datos nuevos. Cada criterio:

```ts
type Familia = "geografia" | "temporal" | "rol" | "logro";

interface Criterio {
  id: string;            // estable, p.ej. "pais:Argentina", "mundial:2018"
  familia: Familia;
  label: string;         // cabecera mostrada, p.ej. "Argentina", "Mundial 2018"
  test: (p: Player) => boolean;
}
```

| id (patrón) | familia | label | test |
|---|---|---|---|
| `pais:{X}` | geografia | bandera/nombre del país | `p.paisEs === X` |
| `conf:{C}` | geografia | "CONMEBOL", "UEFA", … | `p.confederacion === C` |
| `pos:{P}` | rol | "Portero", "Defensa", … | `p.posicion === P` |
| `mundial:{Y}` | temporal | "Mundial {Y}" | `p.mundiales.includes(Y)` |
| `decada:{D}` | temporal | "Nació en los {D}" | nacimiento en `[D, D+9]` |
| `campeon` | logro | "Campeón del mundo" | `p.campeon` |
| `veterano` | logro | "3+ Mundiales" | `p.mundiales.length >= 3` |
| `alto` | logro | "Mide 1,90 m+" | `p.altura != null && p.altura >= 190` |

Los valores concretos de `pais`/`conf`/`pos`/`mundial`/`decada` se generan **a partir de la BD** (solo los que tienen suficientes jugadores), no se hardcodean. `campeon`/`veterano`/`alto` son fijos. `alto` solo es elegible cuando hay assets de altura (planteles 2026) — la validación de celda (§5) lo cubre automáticamente.

## 4. Compatibilidad de criterios

Para que cada celda sea **resoluble y no redundante**, el generador respeta:

- **No cruzar dos criterios de la misma `familia`** en una celda. Evita celdas imposibles (Argentina × Brasil) y redundantes (Argentina × CONMEBOL, donde la confederación no aporta nada). Como fila y columna mezclan familias distintas, cada celda cruza familias distintas por construcción si controlamos la asignación (ver §5).
- **Cada celda debe tener ≥ K jugadores elegibles** en la BD (inicial `K = 3`) para ser humanamente resoluble. Es la garantía dura: descarta cualquier combinación imposible o demasiado nicho.

## 5. Generación de la grilla (`lib/rejilla/generate.ts`)

Mismo patrón de reintentos que `lib/conexion/generate.ts`.

```ts
interface Rejilla {
  filas: Criterio[];     // 3
  columnas: Criterio[];  // 3
  // por celda [f][c]: nº de elegibles en la BD (para escasez local y para verificar K)
  elegibles: number[][];
  id: string;            // identificador estable de la grilla (clave de día en Diario)
}

export function generarRejilla(rng: Rng): Rejilla;
```

Algoritmo (hasta ~50 intentos):
1. Elegir 6 criterios de modo que las **familias** permitan que las 9 celdas crucen familias distintas. Estrategia simple y robusta: asignar a filas y columnas familias complementarias (p.ej. filas ∈ {geografia, temporal, rol}, columnas ∈ {temporal, rol, logro}) y reintentar; la regla §4 se valida igualmente celda a celda.
2. Para cada celda `(f,c)`: `n = PLAYERS.filter(x => filas[f].test(x) && columnas[c].test(x)).length`.
3. Si **alguna** celda tiene `n < K` → descartar y reintentar.
4. Devolver la grilla con la matriz `elegibles`.

**Determinismo:** el generador recibe el **RNG sembrado existente** (`lib/engine/rng.ts`), nunca `Math.random()` en la lógica testeable. El modo **Diario** lo siembra con la clave del día (§8); **Práctica** con semilla aleatoria post-mount (mismo patrón que `/play` y Penales).

## 6. Puntuación — Fase 1: escasez local (`lib/rejilla/rarity.ts`)

Cada celda acertada vale según cuántos jugadores de la BD la cumplen (`elegibles[f][c]`): cuanto más restrictiva, más puntos. Mapeo por tramos (calibrable):

```ts
// n = elegibles de la celda
function puntosCelda(n: number): number {
  if (n <= 3)  return 95;
  if (n <= 6)  return 80;
  if (n <= 12) return 60;
  if (n <= 25) return 40;
  if (n <= 50) return 25;
  return 15;
}
```

- **Puntaje de partida** = suma de `puntosCelda` de las celdas acertadas.
- **9/9** → bonus "Rejilla Perfecta" (p.ej. +100).
- (Opcional, refinamiento dentro de Fase 1) pequeño bonus si el jugador elegido es **poco obvio** — proxy de fama inversa: `!p.campeon && p.mundiales.length < 3` → +10 % sobre la celda. Marca la dirección que la Fase 2 hará exacta.

Determinista y offline: la escasez es un hecho de la BD, no depende de otros usuarios → **cero cold-start**, funciona igual que el resto de juegos solo.

## 7. Puntuación — Fase 2: rareza social (Supabase, opcional)

Capa **encima** de la Fase 1, **no bloqueante**. Replica el gancho real de Immaculate Grid: tras acertar una celda (solo en **Diario**), registra la elección y muestra *"el X % eligió a este jugador"*.

- **Transporte:** cliente existente `lib/supabase.ts` (`supabase` puede ser `null` → todo este bloque se omite con un guard, como hace el multijugador).
- **Persistencia (NUEVA — hoy el repo solo usa Realtime efímero, sin tablas):** tabla agregada e idempotente vía RPC, no INSERT directo (mitiga abuso con anon key, ya que la app no tiene login):

  ```sql
  create table rejilla_picks (
    grid_id   text not null,   -- clave del día (dateKey del Diario)
    cell      text not null,   -- "f,c"
    player_id text not null,
    n         int  not null default 0,
    primary key (grid_id, cell, player_id)
  );
  create table rejilla_cell_totals (
    grid_id text not null,
    cell    text not null,
    total   int  not null default 0,
    primary key (grid_id, cell)
  );
  -- RPC que incrementa pick + total de forma atómica; única operación expuesta al anon.
  create function rejilla_pick(p_grid text, p_cell text, p_player text) returns void ...;
  -- RLS: anon puede EJECUTAR la RPC y SELECT de las dos tablas; sin INSERT/UPDATE directo.
  ```
- **Lectura:** `rarezaSocial = 1 - (n_pick / total_cell)`. Se muestra solo si `total_cell ≥ UMBRAL` (p.ej. 20); por debajo del umbral (cold-start) se cae a la Fase 1 sin mostrar % social.
- **Escritura:** fire-and-forget tras el acierto; si falla o no hay red, se ignora (el juego ya está resuelto con Fase 1).
- **Requiere acción manual** (fuera del PR): crear las tablas + la RPC + políticas RLS en el dashboard de Supabase. El SQL completo va como apéndice del plan de implementación.

> La Fase 2 es **independiente y posterior**: la Fase 1 entrega un juego completo y pulido por sí sola.

## 8. Modo Diario, Práctica y persistencia

- **Diario:** `lib/rejilla/daily.ts` reutiliza el patrón de `lib/incognita/daily.ts` (`dateKey(date)` → semilla del RNG → `generarRejilla`). Todos ven la **misma grilla** hoy; el resultado del día se **guarda** y al volver el mismo día se muestra tu grilla resuelta (no se rejuega). `grid_id` (Fase 2) = `dateKey`.
- **Práctica:** grilla aleatoria cada partida (semilla aleatoria), rejugable infinito, sin afectar el resultado diario.
- **Persistencia (`lib/storage/localStore.ts`, extensión mínima — mismo enfoque que `recordPenales`):**

  ```ts
  rejilla: {
    mejorPuntaje: number;
    partidasJugadas: number;
    mejorLlenado: number;          // máx. celdas resueltas en una partida (0..9)
    rachaDiaria: number;           // días consecutivos jugando el Diario
    ultimoDiaJugado: string | null;// dateKey del último Diario jugado
    diario: { fecha: string; respuestas: (string|null)[]; puntos: number } | null; // estado de hoy
  }
  ```
  - `defaultSaveData()` lo inicializa; el merge existente de `loadData` da compatibilidad con saves antiguos (sin migración).
  - Funciones nuevas: `loadRejillaDiario()`, `saveRejillaDiario(...)`, `recordRejilla(resultado)`. Tests en `localStore.test.ts`.

## 9. Búsqueda / autocompletado (`lib/rejilla/search.ts` + `components/rejilla/Buscador.tsx`)

No existe buscador de jugadores en el repo (la Incógnita usa teclado on-screen). Se construye nuevo:

- **Índice:** sobre `PLAYERS`, indexando `normalize(nombre)` y `normalize(apellido)` (reutiliza `lib/incognita/normalize.ts`). Búsqueda por **substring** del texto normalizado.
- **Resolución exacta:** cada sugerencia es un `Player` concreto → al elegir, se valida ese `Player.id` (sin la ambigüedad de apellidos repetidos que tendría el texto libre).
- **Sugerencias:** muestran foto miniatura (de `getFoto`/`conFoto`) + nombre + país para desambiguar; **excluyen** jugadores ya usados en la grilla. Límite ~8 resultados, orden: coincidencia de apellido antes que de nombre, luego por nº de Mundiales (los más conocidos arriba).
- Accesible (combobox con teclado), respeta `prefers-reduced-motion`.

## 10. Estructura de archivos

```
lib/rejilla/
  criterios.ts        # catálogo + generación de valores desde la BD
  criterios.test.ts
  generate.ts         # generarRejilla(rng) con reintentos + validación K
  generate.test.ts
  rarity.ts           # puntosCelda / total / bonus (Fase 1)
  rarity.test.ts
  search.ts           # índice de búsqueda de jugadores
  search.test.ts
  daily.ts            # grilla diaria determinista (patrón incognita/daily)
  daily.test.ts
  social.ts           # (Fase 2) wrapper Supabase rejilla_pick / lectura de %, con guards
hooks/
  useRejilla.ts       # estado de juego: celda activa, intentos, puntuación, persistencia, diario/práctica
components/rejilla/
  Grid.tsx            # grilla 3×3 + cabeceras de criterio
  Celda.tsx           # vacía / acierto (foto) / fallo (✕) / rareza
  Buscador.tsx        # input con autocompletado
app/rejilla/
  page.tsx            # 'use client' — selector Diario/Práctica → juego → resultado
```
Integración hub:
- **`lib/games.ts`:** alta de `rejilla: { nombre: "Rejilla Mundialista", solo: "/rejilla", accent: "var(--color-cyan)" }`.
- **`app/solo/page.tsx`:** nueva `GameCard` (con un mini-visual de grilla 3×3) apuntando a `/rejilla`.
- Multijugador: **fuera de alcance** de esta spec (posible fase futura).

## 11. UI / estética

1. **Inicio:** dos botones — "Reto de hoy" (Diario) y "Práctica". Si ya jugaste el Diario hoy, muestra tu grilla y el resultado.
2. **Juego:** la grilla 3×3 con cabeceras de criterio (banderas/iconos donde aplique, reutilizando `JerseyAvatar`/iconos existentes); contador de intentos restantes; al tocar una celda se abre el `Buscador`. Acierto → la foto entra animada (Framer Motion) + puntos count-up (`AnimatedNumber`); fallo → shake + ✕ roja.
3. **Resultado:** N/9, puntuación total, sello "Rejilla Perfecta" + `Confetti` si 9/9, botón compartir (texto tipo emoji-grid para Diario), "Jugar de nuevo"/"Inicio".
4. Estética Fiesta Memphis (`MemphisBackground`, paleta CSS). `prefers-reduced-motion` ya cubierto globalmente. `AdBanner` al pie, como los demás juegos.

## 12. Testing

- **`criterios.test.ts`:** cada `test` clasifica correctamente casos conocidos; la generación de valores desde la BD solo incluye los que superan el mínimo de población.
- **`generate.test.ts`:** con RNG sembrado, **toda celda** de la grilla generada tiene `elegibles ≥ K`; ninguna celda cruza dos criterios de la misma familia; filas/columnas tienen 3 criterios distintos cada una; reproducible con la misma semilla.
- **`rarity.test.ts`:** `puntosCelda` respeta los tramos en los bordes (3/6/12/25/50); el total suma celdas acertadas; bonus 9/9; bonus de "poco obvio" se aplica solo cuando corresponde.
- **`search.test.ts`:** búsqueda por nombre y por apellido (con y sin acentos vía `normalize`); excluye jugadores ya usados; resuelve a `Player.id` único.
- **`daily.test.ts`:** misma fecha → misma grilla (estable); fechas distintas → grillas distintas (dispersión), reutilizando el enfoque de `incognita/daily.test.ts`.
- **`localStore.test.ts`:** `recordRejilla` acumula mejor puntaje/llenado/racha; `saveRejillaDiario`/`loadRejillaDiario` redondean el estado del día; saves antiguos sin `rejilla` cargan con defaults.
- **`useRejilla`:** (donde aplique) acierto coloca y puntúa; fallo bloquea la celda y consume intento; sin repetir jugador; fin a las 9 celdas resueltas/bloqueadas.

## 12-bis. Adenda — Niveles de dificultad (implementado)

La dificultad regula el **mínimo de jugadores elegibles por celda** (`kMin`): más alto = más candidatos conocidos por casilla = más fácil.

- `K_POR_DIFICULTAD = { facil: 12, normal: 6, dificil: 3 }` en `lib/rejilla/generate.ts`.
- `generarRejilla(rng, id, kMin)` apunta a `kMin` y **relaja de forma escalonada** hasta `K` (3) si no encuentra grilla al nivel pedido; como último recurso, el fallback amplio. Garantiza solución siempre y dificultad graduada (verificado: promedio de jugadores por celda Fácil 76 > Normal 46 > Difícil 34; fallback < 1 %).
- **Reto de hoy:** un único reto compartido por todos a dificultad **normal** (`rejillaDelDia`), para no romper el "mismo reto para todos" ni la comparación social.
- **Práctica:** el jugador elige Fácil / Normal / Difícil en el selector; `rejillaAleatoria(dificultad)`.
- No requiere cambios en `localStore` (los récords son agregados). Tests: piso absoluto `K` en toda celda y promedios monótonos por dificultad.

## 12-ter. Adenda — Pistas, revelar, rareza social y multijugador (implementado)

### Pistas (`lib/rejilla/search.ts`, `rarity.ts`)
- En el buscador de una celda: botón **Pista** que revela la inicial del apellido de un jugador válido (`pistaCelda`). Penaliza `PENAL_PISTA = 30` puntos, una sola vez por celda (`pistasUsadas: Set<number>` en el hook). Deshabilitada en multijugador (el `Buscador` oculta la pista si no recibe `onPista`).

### Revelar respuestas (`validosCelda`, `components/rejilla/Celda.tsx`)
- Al terminar (si no fue 9/9): botón **Ver respuestas** que, por cada celda no acertada, muestra atenuado un jugador que sí cumplía ("pudo ser"), vía `validosCelda(grilla, idx, 1, usados)`.

### Rareza social — Fase 2 (`lib/rejilla/social.ts`, `supabase/rejilla_social.sql`)
- Solo en **Diario**. Al acertar, `registrarPick(gridId, cell, playerId)` incrementa de forma atómica (RPC `rejilla_pick`) y devuelve la rareza; al recargar el mismo día, `leerRarezas` consulta sin volver a incrementar. Se muestra un badge `X%` en la celda si la celda tiene ≥ `UMBRAL_RAREZA` respuestas.
- **No bloqueante:** si Supabase es `null`, la tabla no existe o falla la red, devuelve `null`/`{}` y el juego sigue con la puntuación local (Fase 1).
- **Acción manual:** ejecutar `supabase/rejilla_social.sql` (tablas + RPC + RLS: lectura pública de agregados, escritura solo vía RPC).

### Multijugador (`app/sala/[codigo]/rejilla/page.tsx`)
- El motor por rondas (`/sala/[codigo]/jugar`) no encaja (la Rejilla es una grilla que se llena con el tiempo), así que tiene **pantalla propia** sobre `useRoom` (presence + broadcast). El lobby enruta `rejilla` a esa ruta.
- **Protocolo:** el host difunde `start {seed}` → todos construyen la **misma** grilla con `generarRejilla(createRng(seed), …, normal)` (determinista). Cada jugador llena la suya y difunde `prog {puntos, aciertos, resueltas, fin}` → **ranking en vivo**. Cuenta atrás de 3 min (`DUR_MS`); al agotarse o terminar todos → pantalla de Resultados. Sin persistencia local (partida efímera).

## 13. Riesgos y notas

- **BD auto-generada:** los criterios deben tolerar `paisEs`/`nacimiento`/`altura` ausentes (filtros defensivos). `alto` y `decada` solo aparecen cuando hay población suficiente — la validación `K` lo garantiza.
- **`mundiales` incluye 2026:** `mundial:2026` es un criterio válido y útil (planteles actuales, con foto); no requiere tratamiento especial.
- **Dificultad calibrable:** `K` (mínimo de elegibles por celda) regula la dureza — subirlo hace grillas más fáciles. Empezar en `K=3` y ajustar con playtesting.
- **Resolución de nombres:** el buscador resuelve a `Player.id`, así que apellidos repetidos (varios "Silva", "González") no son ambiguos; el riesgo es de **cobertura** del índice (que el jugador que el usuario tiene en mente esté en la BD) — mitigado mostrando solo sugerencias existentes.
- **Fase 2 (Supabase) es opcional y posterior:** requiere crear tabla + RPC + RLS en el dashboard (acción manual del dueño). Hasta entonces, la Fase 1 es el juego completo. El guard `supabase === null` evita cualquier ruptura offline.
- **El plan de implementación debe re-verificar el estado real del código** (el proyecto evoluciona): props reales de `GameCard`, helpers vigentes de `lib/db/queries.ts` (`conFoto`, `getFoto`, `shuffle`, `sample`), firma de `Rng` en `lib/engine/rng.ts`, y forma actual de `SaveData`/`loadData` en `lib/storage/localStore.ts`.
```
