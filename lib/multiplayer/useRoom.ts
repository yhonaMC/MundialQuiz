"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { KITS, PATTERNS, type JerseyCustom, type JerseyPattern } from "@/lib/avatar";

export interface Jugador {
  id: string;
  nombre: string;
  color: string;
  joinedAt: number;
  host?: boolean; // marcado en presencia por quien dirige la partida
  jersey?: JerseyCustom | null; // camiseta customizada (si el jugador la eligió)
}

type Handler = (type: string, payload: Record<string, unknown>) => void;

// Valida la camiseta recibida por presencia (viene de otros clientes: no confiar).
function parseJersey(j: unknown): JerseyCustom | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const out: JerseyCustom = {};
  if (typeof o.kit === "number" && Number.isInteger(o.kit) && o.kit >= 0 && o.kit < KITS.length) out.kit = o.kit;
  if (typeof o.pattern === "string" && PATTERNS.includes(o.pattern as JerseyPattern)) out.pattern = o.pattern as JerseyPattern;
  if (typeof o.dorsal === "number" && Number.isInteger(o.dorsal) && o.dorsal >= 1 && o.dorsal <= 99) out.dorsal = o.dorsal;
  return Object.keys(out).length ? out : null;
}

// Conecta a una sala de Supabase Realtime: presencia (jugadores en vivo) + broadcast
// de eventos (selección de juego, empezar, etc.).
// `extra.host` se publica en presencia para que todos sepan quién dirige (y detecten si
// sale). Puede cambiar en caliente (traspaso de anfitrión): se re-emite `track` sobre el
// mismo canal, sin resuscribir, para no generar salidas/entradas fantasma.
export function useRoom(
  codigo: string,
  perfil: { nombre: string; color: string; jersey?: JerseyCustom },
  extra?: { host?: boolean },
) {
  const hostFlag = !!extra?.host;
  const [players, setPlayers] = useState<Jugador[]>([]);
  const [ready, setReady] = useState(false);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const handlerRef = useRef<Handler | null>(null);
  // Id estable por montaje (init perezoso; leer state en render es válido).
  const [myId] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );

  // Estado actual de lo que publicamos en presencia, accesible desde callbacks
  // sin forzar resuscripción del canal cuando cambia (se sincroniza en un efecto).
  const perfilRef = useRef(perfil);
  const hostRef = useRef(hostFlag);
  const joinedAtRef = useRef(0);

  const presencePayload = useCallback(
    () => ({
      id: myId,
      nombre: perfilRef.current.nombre || "Jugador",
      color: perfilRef.current.color,
      jersey: perfilRef.current.jersey ?? null,
      joinedAt: joinedAtRef.current,
      host: hostRef.current,
    }),
    [myId],
  );

  useEffect(() => {
    if (!supabase || !codigo) return;
    const client = supabase;
    joinedAtRef.current = Date.now();
    const channel = supabase.channel(`sala:${codigo}`, {
      config: { presence: { key: myId }, broadcast: { self: true } },
    });
    chanRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
      const list: Jugador[] = Object.values(state)
        .flat()
        .map((m) => ({
          id: String(m.id),
          nombre: String(m.nombre),
          color: String(m.color),
          joinedAt: Number(m.joinedAt),
          host: Boolean(m.host),
          jersey: parseJersey(m.jersey),
        }));
      list.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      setPlayers(list);
    });

    channel.on("broadcast", { event: "evt" }, ({ payload }) => {
      const p = payload as Record<string, unknown>;
      handlerRef.current?.(String(p.type), p);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(presencePayload());
        setReady(true);
      }
    });

    return () => {
      setReady(false);
      client.removeChannel(channel); // libera el topic para la siguiente página
      chanRef.current = null;
    };
  }, [codigo, myId, presencePayload]);

  // Cambios de perfil o de bandera de anfitrión: re-publicar presencia en caliente.
  // (perfil es estado en los llamadores: su identidad solo cambia al editarlo.)
  useEffect(() => {
    perfilRef.current = perfil;
    hostRef.current = hostFlag;
    if (!ready) return;
    void chanRef.current?.track(presencePayload());
  }, [ready, perfil, hostFlag, presencePayload]);

  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    chanRef.current?.send({ type: "broadcast", event: "evt", payload: { type, ...data } });
  }, []);

  const onEvent = useCallback((h: Handler) => {
    handlerRef.current = h;
  }, []);

  return { players, myId, ready, send, onEvent };
}
