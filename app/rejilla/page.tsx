"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Award, CalendarDays, Eye, EyeOff, Flame, Grid3x3, RotateCcw, Share2, Shuffle, Target, Trophy } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { AdBanner } from "@/components/ui/AdBanner";
import { Grid } from "@/components/rejilla/Grid";
import { Buscador } from "@/components/rejilla/Buscador";
import { useRejilla, type Modo } from "@/hooks/useRejilla";
import type { Dificultad } from "@/lib/rejilla/generate";
import { filaDe, colDe } from "@/lib/rejilla/game";
import { validosCelda } from "@/lib/rejilla/search";
import { compartirImagen, type EstadoCeldaImg } from "@/lib/rejilla/share";
import { loadData, defaultRejillaStats, type RejillaStats } from "@/lib/storage/localStore";
import { sfx } from "@/lib/sound";

const NIVELES: { dif: Dificultad; label: string; desc: string; color: string }[] = [
  { dif: "facil", label: "Fácil", desc: "Relajada", color: "var(--color-green)" },
  { dif: "normal", label: "Normal", desc: "Equilibrada", color: "var(--color-cyan)" },
  { dif: "dificil", label: "Difícil", desc: "Extrema", color: "var(--color-red)" },
];
const LABEL: Record<Dificultad, string> = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

interface Sesion {
  modo: Modo;
  dif: Dificultad;
}

export default function RejillaPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  return (
    <main className="relative flex flex-1 flex-col items-center gap-4 px-4 py-6">
      <MemphisBackground />
      <header className="flex w-full max-w-md items-center justify-between">
        {sesion ? (
          <button
            onClick={() => setSesion(null)}
            className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Modos
          </button>
        ) : (
          <Link
            href="/solo"
            className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Link>
        )}
        <h1 className="text-lg font-black uppercase italic sm:text-xl">
          Rejilla<span className="text-[var(--color-cyan)]"> Mundialera</span>
        </h1>
        <span className="w-12" />
      </header>

      {sesion === null ? (
        <Selector onElegir={(modo, dif) => setSesion({ modo, dif })} />
      ) : (
        <Juego
          key={`${sesion.modo}:${sesion.dif}`}
          modo={sesion.modo}
          dificultad={sesion.dif}
          irAPractica={(dif) => setSesion({ modo: "practica", dif })}
        />
      )}

      <AdBanner className="mt-4 w-full max-w-md" />
    </main>
  );
}

function Selector({ onElegir }: { onElegir: (m: Modo, d: Dificultad) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-md flex-col items-center gap-5 pt-2"
    >
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-cyan)]/15 ring-1 ring-[var(--color-cyan)]/30">
        <Grid3x3 className="h-8 w-8 text-[var(--color-cyan)]" />
      </div>
      <p className="max-w-xs text-center text-sm text-[var(--color-gray-light)]/80">
        Rellena las 9 casillas con un jugador que cumpla el <b className="text-white">criterio de su fila y su columna</b>.
        Un intento por casilla. ¡Cuanto más raro, más puntos!
      </p>

      {/* Reto de hoy */}
      <button
        onClick={() => onElegir("diario", "normal")}
        className="flex w-full items-center gap-4 rounded-3xl bg-[var(--color-navy)] p-5 text-left shadow-xl ring-1 ring-white/10 transition-transform hover:-translate-y-1"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-cyan)] text-[var(--color-navy-deep)]">
          <CalendarDays className="h-7 w-7" />
        </span>
        <span>
          <span className="block text-lg font-black uppercase italic">Reto de hoy</span>
          <span className="block text-sm text-[var(--color-gray-light)]/75">La misma rejilla para todos. Una vez al día.</span>
        </span>
      </button>

      {/* Práctica con dificultad */}
      <div className="w-full rounded-3xl bg-[var(--color-navy)] p-5 shadow-xl ring-1 ring-white/10">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-green)] text-[var(--color-navy-deep)]">
            <Shuffle className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-lg font-black uppercase italic">Práctica</span>
            <span className="block text-sm text-[var(--color-gray-light)]/75">Rejillas infinitas. Elige dificultad:</span>
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {NIVELES.map((n) => (
            <button
              key={n.dif}
              onClick={() => onElegir("practica", n.dif)}
              className="rounded-2xl bg-white/5 px-2 py-3 text-center ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <span className="block text-sm font-black uppercase italic" style={{ color: n.color }}>
                {n.label}
              </span>
              <span className="mt-0.5 block text-[10px] font-bold text-[var(--color-gray-light)]/60">{n.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Estadisticas />
    </motion.div>
  );
}

function Estadisticas() {
  const [s, setS] = useState<RejillaStats>(defaultRejillaStats);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura local al montar
    setS(loadData().rejilla);
  }, []);
  if (s.partidasJugadas === 0) return null;

  const items = [
    { icon: <Trophy className="h-5 w-5 text-[var(--color-cyan)]" />, label: "Mejor", value: s.mejorPuntaje },
    { icon: <Target className="h-5 w-5 text-[var(--color-green)]" />, label: "Tope", value: `${s.mejorLlenado}/9` },
    { icon: <Flame className="h-5 w-5 text-[var(--color-red)]" />, label: "Racha", value: s.rachaDiaria },
    { icon: <Award className="h-5 w-5 text-[var(--color-amber)]" />, label: "Partidas", value: s.partidasJugadas },
  ];
  return (
    <div className="w-full rounded-3xl bg-[var(--color-navy)] p-4 ring-1 ring-white/10">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Tus estadísticas</p>
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {it.icon}
            <span className="text-lg font-black tabular-nums">{it.value}</span>
            <span className="text-[10px] font-bold text-[var(--color-gray-light)]/60">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Juego({
  modo,
  dificultad,
  irAPractica,
}: {
  modo: Modo;
  dificultad: Dificultad;
  irAPractica: (d: Dificultad) => void;
}) {
  const r = useRejilla(modo, dificultad);
  const [toast, setToast] = useState<string | null>(null);
  const [verSol, setVerSol] = useState(false);

  // Soluciones a revelar: un jugador válido por cada celda no acertada.
  const soluciones = useMemo(() => {
    if (!verSol || !r.grilla) return undefined;
    const g = r.grilla;
    return r.tablero.map((c, i) => (c?.ok ? undefined : validosCelda(g, i, 1, r.usados)[0]));
  }, [verSol, r.grilla, r.tablero, r.usados]);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const compartir = useCallback(async () => {
    if (!r.grilla) return;
    sfx.tap();
    const sub = modo === "diario" && r.fecha ? r.fecha : `Práctica (${LABEL[dificultad]})`;
    const resultado = `${r.aciertos}/9 · ${r.puntos} pts`;
    const celdas: EstadoCeldaImg[] = r.tablero.map((c) => (c ? (c.ok ? "ok" : "fail") : "empty"));
    const res = await compartirImagen({ titulo: "Rejilla Mundialera", sub, resultado, celdas });
    if (res === "downloaded") {
      flash("¡Imagen guardada!");
    } else if (res === "error") {
      // Respaldo: copia el texto con la grilla de emojis.
      const emoji = r.tablero.map((c) => (c ? (c.ok ? "🟩" : "🟥") : "⬛"));
      const filas = [0, 1, 2].map((f) => emoji.slice(f * 3, f * 3 + 3).join("")).join("\n");
      try {
        await navigator.clipboard.writeText(`Rejilla Mundialera · ${sub}\n${resultado}\n${filas}`);
        flash("¡Copiado!");
      } catch {
        /* sin portapapeles: se ignora */
      }
    }
  }, [r.grilla, r.tablero, r.aciertos, r.puntos, r.fecha, modo, dificultad, flash]);

  if (!r.grilla) {
    return <p className="py-16 font-black">Cargando…</p>;
  }

  const jugando = r.estado === "jugando";
  const celda = r.celdaActiva;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {r.esPerfecta && <Confetti pieces={64} />}

      {/* Marcador */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-[var(--color-cyan)] px-3 py-1 text-sm font-extrabold text-[var(--color-navy-deep)]">
          <AnimatedNumber value={r.puntos} /> pts
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold tabular-nums">
          <Trophy className="h-4 w-4 text-[var(--color-green)]" /> {r.aciertos}/9
        </span>
        {modo === "diario" && r.stats.rachaDiaria > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold tabular-nums">
            <Flame className="h-4 w-4 text-[var(--color-red)]" /> {r.stats.rachaDiaria}
          </span>
        )}
        {modo === "practica" && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase italic text-[var(--color-gray-light)]">
            {LABEL[dificultad]}
          </span>
        )}
      </div>

      {jugando && (
        <p className="-mt-1 text-center text-xs text-[var(--color-gray-light)]/70">
          Toca una casilla · te quedan <b className="text-white">{r.intentosRestantes}</b>
        </p>
      )}

      <Grid
        grilla={r.grilla}
        tablero={r.tablero}
        jugable={jugando}
        soluciones={soluciones}
        rarezas={r.rarezas}
        onCelda={r.abrirCelda}
      />

      {jugando ? (
        <button
          onClick={r.rendirse}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-[var(--color-gray-light)] hover:bg-white/20"
        >
          Me rindo
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="flex w-full flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] px-6 py-5 text-center shadow-2xl ring-1 ring-white/10"
        >
          <Trophy className="h-9 w-9" style={{ color: r.esPerfecta ? "var(--color-cyan)" : "var(--color-green)" }} />
          <p className="text-2xl font-black uppercase italic">{r.esPerfecta ? "¡Rejilla Perfecta!" : "¡Listo!"}</p>
          <p className="text-sm text-[var(--color-gray-light)]">
            Acertaste <span className="font-black text-white">{r.aciertos}/9</span> ·{" "}
            <span className="font-black text-white">{r.puntos}</span> pts
          </p>
          {modo === "diario" && (
            <p className="text-xs text-[var(--color-gray-light)]/70">
              {r.yaJugadoHoy ? "Ya jugaste el reto de hoy." : "¡Vuelve mañana por una nueva!"}
            </p>
          )}

          {r.aciertos < 9 && (
            <button
              onClick={() => setVerSol((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-[var(--color-gray-light)] hover:bg-white/15"
            >
              {verSol ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-[var(--color-amber)]" />}
              {verSol ? "Ocultar respuestas" : "Ver respuestas"}
            </button>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={compartir}
              className="flex items-center gap-2 rounded-2xl bg-[var(--color-cyan)] px-5 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_5px_0_0_#1a8a98]"
            >
              <Share2 className="h-5 w-5" /> Compartir
            </button>
            {modo === "practica" ? (
              <button
                onClick={r.nuevaPractica}
                className="flex items-center gap-2 rounded-2xl bg-[var(--color-green)] px-5 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_5px_0_0_#2c8a2b]"
              >
                <RotateCcw className="h-5 w-5" /> Otra
              </button>
            ) : (
              <button
                onClick={() => irAPractica("normal")}
                className="flex items-center gap-2 rounded-2xl bg-[var(--color-green)] px-5 py-2.5 font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_5px_0_0_#2c8a2b]"
              >
                <Shuffle className="h-5 w-5" /> Práctica
              </button>
            )}
          </div>
          {toast && <span className="text-xs font-bold text-[var(--color-cyan)]">{toast}</span>}
          <Link href="/solo" className="text-xs font-bold text-[var(--color-gray-light)]/60 hover:text-white">
            Volver a juegos
          </Link>
        </motion.div>
      )}

      <AnimatePresence>
        {celda !== null && (
          <Buscador
            fila={r.grilla.filas[filaDe(celda)]}
            columna={r.grilla.columnas[colDe(celda)]}
            excluir={r.usados}
            pista={r.pistaActual}
            onPista={r.pedirPista}
            onElegir={r.responder}
            onCerrar={r.cerrarCelda}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
