"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/db/types";
import { rejillaAleatoria, rejillaDelDia, dateKey } from "@/lib/rejilla/daily";
import type { Dificultad, Rejilla } from "@/lib/rejilla/generate";
import { getPlayer, pistaCelda } from "@/lib/rejilla/search";
import { PENAL_PISTA } from "@/lib/rejilla/rarity";
import { registrarPick, leerRarezas } from "@/lib/rejilla/social";
import {
  CELDAS,
  cumple,
  jugadoresUsados,
  celdasResueltas,
  aciertos as contarAciertos,
  perfecta,
  puntosTotales,
  terminado,
  nuevoTablero,
  type Tablero,
} from "@/lib/rejilla/game";
import {
  loadData,
  recordRejilla,
  recordRejillaDiario,
  defaultRejillaStats,
  type RejillaStats,
} from "@/lib/storage/localStore";
import { sfx } from "@/lib/sound";

export type Modo = "diario" | "practica";
export type Estado = "jugando" | "terminado";

// Reconstruye el tablero guardado del Diario de hoy (ids → Player) sobre la grilla del día.
function reconstruir(guardado: { id: string; ok: boolean } | null): Tablero[number] {
  if (!guardado) return null;
  const player = getPlayer(guardado.id);
  return player ? { player, ok: guardado.ok } : null;
}

export function useRejilla(modo: Modo, dificultad: Dificultad = "normal") {
  const [grilla, setGrilla] = useState<Rejilla | null>(null);
  const [tablero, setTablero] = useState<Tablero>(nuevoTablero);
  const [celdaActiva, setCeldaActiva] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>("jugando");
  const [fecha, setFecha] = useState<string | null>(null);
  const [yaJugadoHoy, setYaJugadoHoy] = useState(false);
  const [stats, setStats] = useState<RejillaStats>(defaultRejillaStats);
  const [pistasUsadas, setPistasUsadas] = useState<Set<number>>(() => new Set());
  const [rarezas, setRarezas] = useState<Record<number, number>>({}); // % social por celda (Fase 2)

  // Init solo-cliente (Date / Math.random → evita mismatch de hidratación). Las
  // múltiples escrituras son intencionales (cargar grilla + estado guardado al montar).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- init solo-cliente intencional */
    const data = loadData().rejilla;
    setStats(data);
    setPistasUsadas(new Set());
    setRarezas({});
    if (modo === "diario") {
      const hoy = new Date();
      const key = dateKey(hoy);
      setGrilla(rejillaDelDia(hoy));
      setFecha(key);
      const guardado = data.diario;
      if (guardado && guardado.fecha === key) {
        // Ya jugado hoy: mostrar el tablero resuelto (solo lectura).
        setTablero(guardado.respuestas.map(reconstruir));
        setEstado("terminado");
        setYaJugadoHoy(true);
        // Rareza social: lectura (sin re-incrementar) para mostrar el % al recargar.
        const picks = guardado.respuestas
          .map((r, i) => (r?.ok ? { cell: String(i), playerId: r.id } : null))
          .filter((x): x is { cell: string; playerId: string } => x !== null);
        void leerRarezas(key, picks).then((rz) => {
          if (Object.keys(rz).length) setRarezas(rz);
        });
      } else {
        setTablero(nuevoTablero());
        setEstado("jugando");
      }
    } else {
      setGrilla(rejillaAleatoria(dificultad));
      setTablero(nuevoTablero());
      setEstado("jugando");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [modo, dificultad]);

  const usados = useMemo(() => jugadoresUsados(tablero), [tablero]);
  const puntos = useMemo(
    () => (grilla ? Math.max(0, puntosTotales(grilla, tablero) - pistasUsadas.size * PENAL_PISTA) : 0),
    [grilla, tablero, pistasUsadas],
  );
  const aciertos = useMemo(() => contarAciertos(tablero), [tablero]);
  const resueltas = useMemo(() => celdasResueltas(tablero), [tablero]);
  // Pista de la celda activa (solo si ya se pidió para esa celda).
  const pistaActual = useMemo(
    () => (grilla && celdaActiva != null && pistasUsadas.has(celdaActiva) ? pistaCelda(grilla, celdaActiva, usados) : null),
    [grilla, celdaActiva, pistasUsadas, usados],
  );

  const abrirCelda = useCallback(
    (i: number) => {
      if (estado !== "jugando" || tablero[i] !== null) return;
      sfx.tap();
      setCeldaActiva(i);
    },
    [estado, tablero],
  );

  const cerrarCelda = useCallback(() => setCeldaActiva(null), []);

  // Pide pista para la celda activa (penaliza puntos una sola vez por celda).
  const pedirPista = useCallback(() => {
    if (estado !== "jugando" || celdaActiva == null) return;
    sfx.tap();
    setPistasUsadas((prev) => (prev.has(celdaActiva) ? prev : new Set(prev).add(celdaActiva)));
  }, [estado, celdaActiva]);

  // Cierra la partida: persiste récords (Diario o Práctica) y suena el cierre.
  const finalizar = useCallback(
    (final: Tablero) => {
      if (!grilla) return;
      setEstado("terminado");
      const pts = Math.max(0, puntosTotales(grilla, final) - pistasUsadas.size * PENAL_PISTA);
      const res = celdasResueltas(final);
      if (modo === "diario" && fecha) {
        const diario = {
          fecha,
          puntos: pts,
          respuestas: final.map((r) => (r ? { id: r.player.id, ok: r.ok } : null)),
        };
        setStats(recordRejillaDiario(diario, res).rejilla);
        // Capa social (Fase 2): registra cada acierto y muestra su rareza. No bloqueante.
        void (async () => {
          const upd: Record<number, number> = {};
          await Promise.all(
            final.map(async (c, i) => {
              if (c?.ok) {
                const rar = await registrarPick(fecha, String(i), c.player.id);
                if (rar) upd[i] = rar.pct;
              }
            }),
          );
          if (Object.keys(upd).length) setRarezas((prev) => ({ ...prev, ...upd }));
        })();
      } else {
        setStats(recordRejilla(pts, res).rejilla);
      }
      window.setTimeout(() => (perfecta(final) ? sfx.win() : sfx.lose()), 250);
    },
    [grilla, modo, fecha, pistasUsadas],
  );

  const responder = useCallback(
    (player: Player) => {
      if (grilla == null || celdaActiva == null || estado !== "jugando") return;
      if (usados.has(player.id)) return; // sin repetir jugador en la grilla
      const idx = celdaActiva;
      const ok = cumple(grilla, idx, player);
      const next: Tablero = [...tablero];
      next[idx] = { player, ok };
      setTablero(next);
      setCeldaActiva(null);
      if (ok) sfx.correct();
      else sfx.wrong();
      if (terminado(next)) finalizar(next);
    },
    [grilla, celdaActiva, estado, usados, tablero, finalizar],
  );

  // Rendirse: termina la partida dejando sin resolver las celdas no intentadas.
  const rendirse = useCallback(() => {
    if (estado !== "jugando") return;
    setCeldaActiva(null);
    finalizar(tablero);
  }, [estado, tablero, finalizar]);

  // Solo Práctica: nueva grilla sin salir del juego.
  const nuevaPractica = useCallback(() => {
    if (modo !== "practica") return;
    sfx.tap();
    setGrilla(rejillaAleatoria(dificultad));
    setTablero(nuevoTablero());
    setCeldaActiva(null);
    setEstado("jugando");
    setPistasUsadas(new Set());
    setRarezas({});
  }, [modo, dificultad]);

  return {
    grilla,
    tablero,
    celdaActiva,
    estado,
    fecha,
    yaJugadoHoy,
    stats,
    puntos,
    aciertos,
    resueltas,
    intentosRestantes: CELDAS - resueltas,
    usados,
    esPerfecta: estado === "terminado" && perfecta(tablero),
    pistasUsadas,
    pistaActual,
    rarezas,
    abrirCelda,
    cerrarCelda,
    pedirPista,
    responder,
    rendirse,
    nuevaPractica,
  };
}
