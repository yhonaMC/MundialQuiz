import { PLAYERS } from "@/lib/db/players";
import { getFoto } from "@/lib/db/queries";
import type { Player } from "@/lib/db/types";

export interface Ronda {
  players: Player[]; // 6 jugadores barajados (con foto si existe)
  matchIds: string[]; // los 3 que comparten la relación
  label: string; // relación revelada
  tipo: string; // categoría de la pista
}

const MATCH = 3; // cuántos comparten la relación
const TOTAL = 6; // cartas en la ronda

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sample<T>(arr: readonly T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
function valuesWithEnough(key: (p: Player) => string): string[] {
  const counts = new Map<string, number>();
  for (const p of PLAYERS) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n >= MATCH).map(([v]) => v);
}

interface Relacion {
  tipo: string;
  build: () => { test: (p: Player) => boolean; label: string } | null;
}

const RELACIONES: Relacion[] = [
  {
    tipo: "país",
    build: () => {
      const pais = pick(valuesWithEnough((p) => p.paisEs));
      return { test: (p) => p.paisEs === pais, label: `Los 3 juegan para ${pais}` };
    },
  },
  {
    tipo: "posición",
    build: () => {
      const pos = pick(valuesWithEnough((p) => p.posicion));
      return { test: (p) => p.posicion === pos, label: `Los 3 son ${pos.toLowerCase()}s` };
    },
  },
  {
    tipo: "Mundial",
    build: () => {
      const counts = new Map<number, number>();
      for (const p of PLAYERS) for (const y of p.mundiales) counts.set(y, (counts.get(y) ?? 0) + 1);
      const years = [...counts.entries()].filter(([, n]) => n >= MATCH).map(([y]) => y);
      const year = pick(years);
      return { test: (p) => p.mundiales.includes(year), label: `Los 3 jugaron el Mundial ${year}` };
    },
  },
  {
    tipo: "campeón",
    build: () => ({ test: (p) => p.campeon, label: "Los 3 fueron campeones del mundo" }),
  },
  {
    tipo: "confederación",
    build: () => {
      const conf = pick(valuesWithEnough((p) => p.confederacion));
      return { test: (p) => p.confederacion === conf, label: `Los 3 son de ${conf}` };
    },
  },
];

const withFoto = (p: Player): Player => {
  const foto = getFoto(p.id);
  return foto ? { ...p, foto } : p;
};

// Genera una ronda: 3 jugadores que cumplen una relación + 3 distractores que no.
export function generarRonda(): Ronda {
  // Intenta hasta encontrar una relación con suficientes coincidencias y distractores.
  for (let intento = 0; intento < 20; intento++) {
    const rel = pick(RELACIONES);
    const built = rel.build();
    if (!built) continue;
    const matchPool = PLAYERS.filter(built.test);
    const distractPool = PLAYERS.filter((p) => !built.test(p));
    if (matchPool.length < MATCH || distractPool.length < TOTAL - MATCH) continue;

    const matched = sample(matchPool, MATCH);
    const distractors = sample(distractPool, TOTAL - MATCH);
    const players = sample([...matched, ...distractors], TOTAL).map(withFoto);
    return {
      players,
      matchIds: matched.map((p) => p.id),
      label: built.label,
      tipo: rel.tipo,
    };
  }
  // Fallback ultra-seguro: relación "campeón".
  const matched = sample(PLAYERS.filter((p) => p.campeon), MATCH);
  const distractors = sample(PLAYERS.filter((p) => !p.campeon), TOTAL - MATCH);
  return {
    players: sample([...matched, ...distractors], TOTAL).map(withFoto),
    matchIds: matched.map((p) => p.id),
    label: "Los 3 fueron campeones del mundo",
    tipo: "campeón",
  };
}
