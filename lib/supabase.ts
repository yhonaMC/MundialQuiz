import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente único para Realtime. null si faltan las env (la UI cae a modo offline).
export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, { realtime: { params: { eventsPerSecond: 20 } } })
    : null;

export const realtimeDisponible = Boolean(supabase);
