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
type PerfilVivo = { nombre: string; color: string; jersey: JerseyCustom | null };

// Valida la camiseta recibida por la red (viene de otros clientes: no confiar).
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
//
// Cambios de perfil en caliente: Presence acumula metas duplicadas si se re-trackea
// (verificado contra Supabase: cada track añade una meta en vez de reemplazarla, y en
// ráfagas hasta te borra de la vista de otros). Por eso aquí:
//  1. se deduplica por id quedándose con la meta más nueva (las nuevas van al final),
//  2. el re-track va con debounce (una ráfaga del editor = un solo track),
//  3. los cambios de perfil se difunden además por broadcast ("perfil") y se aplican
//     como overlay encima de la presencia, para verse al instante en todos.
export function useRoom(
  codigo: string,
  perfil: { nombre: string; color: string; jersey?: JerseyCustom },
  extra?: { host?: boolean },
) {
  const hostFlag = !!extra?.host;
  const [crudos, setCrudos] = useState<Jugador[]>([]);
  const [vivos, setVivos] = useState<Record<string, PerfilVivo>>({});
  const [ready, setReady] = useState(false);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const handlerRef = useRef<Handler | null>(null);
  // Id estable por montaje (init perezoso; leer state en render es válido).
  const [myId] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );

  // Estado actual de lo que publicamos, accesible desde callbacks sin resuscribir
  // el canal (se sincroniza en el efecto de re-publicación).
  const perfilRef = useRef(perfil);
  const hostRef = useRef(hostFlag);
  const joinedAtRef = useRef(0);
  const firstPublishRef = useRef(true);

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
      // La última meta por id gana: las re-publicaciones se acumulan al final.
      const byId = new Map<string, Jugador>();
      for (const m of Object.values(state).flat()) {
        byId.set(String(m.id), {
          id: String(m.id),
          nombre: String(m.nombre),
          color: String(m.color),
          joinedAt: Number(m.joinedAt),
          host: Boolean(m.host),
          jersey: parseJersey(m.jersey),
        });
      }
      const list = [...byId.values()];
      list.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      setCrudos(list);
    });

    channel.on("broadcast", { event: "evt" }, ({ payload }) => {
      const p = payload as Record<string, unknown>;
      handlerRef.current?.(String(p.type), p);
    });

    // Cambios de perfil en vivo (overlay instantáneo encima de la presencia).
    channel.on("broadcast", { event: "perfil" }, ({ payload }) => {
      const p = payload as Record<string, unknown>;
      const id = String(p.id);
      setVivos((v) => ({
        ...v,
        [id]: { nombre: String(p.nombre || "Jugador"), color: String(p.color), jersey: parseJersey(p.jersey) },
      }));
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

  // Cambios de perfil o de bandera de anfitrión: difundir al instante por broadcast
  // y re-publicar presencia con debounce (para quien se una más tarde).
  useEffect(() => {
    perfilRef.current = perfil;
    hostRef.current = hostFlag;
    if (!ready) return;
    if (firstPublishRef.current) {
      // El track inicial del subscribe ya publicó este estado.
      firstPublishRef.current = false;
      return;
    }
    void chanRef.current?.send({
      type: "broadcast",
      event: "perfil",
      payload: { id: myId, nombre: perfil.nombre || "Jugador", color: perfil.color, jersey: perfil.jersey ?? null },
    });
    const t = setTimeout(() => void chanRef.current?.track(presencePayload()), 800);
    return () => clearTimeout(t);
  }, [ready, perfil, hostFlag, myId, presencePayload]);

  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    chanRef.current?.send({ type: "broadcast", event: "evt", payload: { type, ...data } });
  }, []);

  const onEvent = useCallback((h: Handler) => {
    handlerRef.current = h;
  }, []);

  // Lista final: presencia deduplicada + overlay de perfiles en vivo.
  const players = crudos.map((p) => {
    const v = vivos[p.id];
    return v ? { ...p, nombre: v.nombre, color: v.color, jersey: v.jersey } : p;
  });

  return { players, myId, ready, send, onEvent };
}
