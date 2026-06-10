// Capa social opcional (Fase 2): "¿qué % de jugadores eligió a este jugador?".
// 100% NO bloqueante — si Supabase no está configurado, la tabla no existe o falla
// la red, devuelve null y el juego sigue funcionando con la puntuación local (Fase 1).
//
// Requiere crear en Supabase la tabla agregada + la función `rejilla_pick` (ver
// supabase/rejilla_social.sql). Hasta entonces, todo esto es inofensivo (no-op).
import { supabase } from "@/lib/supabase";

// Por debajo de este nº de respuestas a una celda, el % social no es representativo
// (cold-start) y no se muestra: se cae a la escasez local.
export const UMBRAL_RAREZA = 15;

export interface Rareza {
  pct: number; // % de jugadores que eligió ESTE jugador en esta celda
  total: number; // respuestas totales registradas para la celda
}

// Registra la elección (incrementa de forma atómica vía RPC) y devuelve la rareza
// resultante, o null si no hay backend / no hay datos suficientes / falla.
export async function registrarPick(gridId: string, cell: string, playerId: string): Promise<Rareza | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("rejilla_pick", {
      p_grid: gridId,
      p_cell: cell,
      p_player: playerId,
    });
    if (error || !data) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { n?: number; total?: number } | null;
    const total = Number(row?.total ?? 0);
    const n = Number(row?.n ?? 0);
    if (!total || total < UMBRAL_RAREZA) return null;
    return { pct: Math.round((n / total) * 100), total };
  } catch {
    return null;
  }
}

// Lee la rareza de varias celdas SIN incrementar (para mostrar el % al recargar el
// Diario ya jugado). Devuelve { idxCelda: pct } solo para las celdas con datos suficientes.
export async function leerRarezas(
  gridId: string,
  picks: { cell: string; playerId: string }[],
): Promise<Record<number, number>> {
  if (!supabase || picks.length === 0) return {};
  try {
    const cells = [...new Set(picks.map((p) => p.cell))];
    const myPlayers = [...new Set(picks.map((p) => p.playerId))];
    const [totalsRes, picksRes] = await Promise.all([
      supabase.from("rejilla_cell_totals").select("cell,total").eq("grid_id", gridId).in("cell", cells),
      supabase.from("rejilla_picks").select("cell,player_id,n").eq("grid_id", gridId).in("cell", cells).in("player_id", myPlayers),
    ]);
    const totalDe = new Map<string, number>();
    for (const r of totalsRes.data ?? []) totalDe.set(String(r.cell), Number(r.total));
    const nDe = new Map<string, number>();
    for (const r of picksRes.data ?? []) nDe.set(`${r.cell}|${r.player_id}`, Number(r.n));

    const out: Record<number, number> = {};
    for (const p of picks) {
      const total = totalDe.get(p.cell) ?? 0;
      const n = nDe.get(`${p.cell}|${p.playerId}`) ?? 0;
      if (total >= UMBRAL_RAREZA && n > 0) out[Number(p.cell)] = Math.round((n / total) * 100);
    }
    return out;
  } catch {
    return {};
  }
}
