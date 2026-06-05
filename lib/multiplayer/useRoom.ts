"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface Jugador {
  id: string;
  nombre: string;
  color: string;
  joinedAt: number;
  host?: boolean; // marcado en presencia por quien dirige la partida
}

type Handler = (type: string, payload: Record<string, unknown>) => void;

// Conecta a una sala de Supabase Realtime: presencia (jugadores en vivo) + broadcast
// de eventos (selección de juego, empezar, etc.). El anfitrión es quien entró primero.
// `extra.host` se publica en presencia para que todos sepan quién dirige (y detecten si sale).
export function useRoom(
  codigo: string,
  perfil: { nombre: string; color: string },
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

  useEffect(() => {
    if (!supabase || !codigo) return;
    const client = supabase;
    const id = myId;
    const joinedAt = Date.now();
    const channel = supabase.channel(`sala:${codigo}`, {
      config: { presence: { key: id }, broadcast: { self: true } },
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
        await channel.track({ id, nombre: perfil.nombre || "Jugador", color: perfil.color, joinedAt, host: hostFlag });
        setReady(true);
      }
    });

    return () => {
      setReady(false);
      client.removeChannel(channel); // libera el topic para la siguiente página
      chanRef.current = null;
    };
  }, [codigo, perfil.nombre, perfil.color, myId, hostFlag]);

  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    chanRef.current?.send({ type: "broadcast", event: "evt", payload: { type, ...data } });
  }, []);

  const onEvent = useCallback((h: Handler) => {
    handlerRef.current = h;
  }, []);

  const isHost = players.length > 0 && players[0].id === myId;

  return { players, isHost, myId, ready, send, onEvent };
}
