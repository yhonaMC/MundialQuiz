"use client";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { JerseyAvatar } from "@/components/ui/JerseyAvatar";
import { jerseyFor, KITS, PATTERNS, type JerseyPattern } from "@/lib/avatar";
import { AVATAR_COLORS, type Perfil } from "@/lib/perfil";

const PATTERN_LABELS: Record<JerseyPattern, string> = {
  solid: "Lisa",
  stripes: "Rayas",
  sash: "Banda",
  halves: "Mitades",
  hoops: "Aros",
};

// Editor de identidad del jugador: apodo, color y camiseta (kit, patrón, dorsal).
// `onChange` recibe el perfil completo en cada cambio; el padre decide persistir.
export function PerfilEditor({ value, onChange }: { value: Perfil; onChange: (p: Perfil) => void }) {
  // Valores efectivos: lo customizado o, en su defecto, lo derivado del nombre.
  const efectiva = jerseyFor(value.nombre, value.jersey);
  const kitActivo =
    value.jersey?.kit ?? KITS.findIndex(([p, s]) => p === efectiva.primary && s === efectiva.secondary);
  const patron = value.jersey?.pattern ?? efectiva.pattern;
  const dorsal = value.jersey?.dorsal ?? efectiva.number;

  // Al tocar cualquier control se materializa la camiseta completa: así el aspecto
  // ya no cambia si luego se edita el apodo (la derivación por hash depende del nombre).
  const setJersey = (patch: Partial<NonNullable<Perfil["jersey"]>>) =>
    onChange({ ...value, jersey: { kit: kitActivo, pattern: patron, dorsal, ...patch } });
  const cambiarDorsal = (delta: number) => setJersey({ dorsal: ((dorsal - 1 + delta + 99) % 99) + 1 });

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Apodo + vista previa grande de la camiseta */}
      <div className="flex items-center gap-4">
        <motion.div
          key={`${kitActivo}-${patron}-${dorsal}`}
          initial={{ scale: 0.85, rotate: -4 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="shrink-0"
        >
          <JerseyAvatar nombre={value.nombre} jersey={value.jersey} size={84} ring={value.color} />
        </motion.div>
        <div className="flex w-full flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
            Tu apodo
          </label>
          <input
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value.slice(0, 12) })}
            placeholder="Tu apodo"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 font-bold text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-green)]"
          />
        </div>
      </div>

      {/* Color de identidad (aro del avatar) */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          Tu color
        </p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...value, color: c })}
              aria-label={`Color ${c}`}
              className="h-7 w-7 rounded-full transition-transform"
              style={{
                backgroundColor: c,
                outline: value.color === c ? "3px solid #fff" : "none",
                outlineOffset: "2px",
                transform: value.color === c ? "scale(1.1)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Kit de colores de la camiseta */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
          Camiseta
        </p>
        <div className="flex flex-wrap gap-2">
          {KITS.map(([p, s], i) => (
            <button
              key={`${p}-${s}`}
              onClick={() => setJersey({ kit: i })}
              aria-label={`Kit ${i + 1}`}
              className="h-8 w-8 rounded-full ring-1 ring-white/20 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${p} 50%, ${s} 50%)`,
                outline: kitActivo === i ? "3px solid #fff" : "none",
                outlineOffset: "2px",
                transform: kitActivo === i ? "scale(1.12)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Patrón + dorsal */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
            Patrón
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PATTERNS.map((pt) => (
              <button
                key={pt}
                onClick={() => setJersey({ pattern: pt })}
                className="rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition"
                style={{
                  backgroundColor: patron === pt ? "var(--color-green)" : "rgba(255,255,255,0.06)",
                  color: patron === pt ? "var(--color-navy-deep)" : "#fff",
                  borderColor: "transparent",
                  boxShadow: patron === pt ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                {PATTERN_LABELS[pt]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">
            Dorsal
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => cambiarDorsal(-1)}
              aria-label="Dorsal anterior"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-xl font-black tabular-nums">{dorsal}</span>
            <button
              onClick={() => cambiarDorsal(1)}
              aria-label="Dorsal siguiente"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
