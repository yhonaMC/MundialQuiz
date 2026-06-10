"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, LogIn } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { AVATAR_COLORS, ensurePerfil, iniciales, savePerfil } from "@/lib/perfil";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function nuevoCodigo(): string {
  let c = "";
  for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

export default function MultijugadorPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);

  // Cargar perfil guardado (solo cliente).
  useEffect(() => {
    const p = ensurePerfil();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init solo-cliente intencional
    setNombre(p.nombre);
    setColor(p.color);
  }, []);

  const persistir = () => savePerfil({ nombre, color });
  const crear = () => {
    persistir();
    router.push(`/sala/${nuevoCodigo()}?host=1`);
  };
  const unir = () => {
    const c = codigo.trim().toUpperCase();
    if (c.length >= 4) {
      persistir();
      router.push(`/sala/${c}`);
    }
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <MemphisBackground />

      <div className="flex w-full max-w-md items-center">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-black uppercase italic sm:text-4xl">Multijugador</h1>
        <p className="mt-1 text-sm text-[var(--color-gray-light)]/80">Juega con amigos en tiempo real</p>
      </div>

      {/* Perfil: avatar + apodo */}
      <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">Tu perfil</p>
        <div className="flex items-center gap-3">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-black text-[var(--color-navy-deep)] ring-2 ring-white/20"
            style={{ backgroundColor: color }}
          >
            {iniciales(nombre)}
          </span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 12))}
            placeholder="Tu apodo"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 font-bold text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-green)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className="h-8 w-8 rounded-full transition-transform"
              style={{
                backgroundColor: c,
                outline: color === c ? "3px solid #fff" : "none",
                outlineOffset: "2px",
                transform: color === c ? "scale(1.1)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <motion.button
          onClick={crear}
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2 rounded-3xl bg-[var(--color-green)] px-6 py-5 text-lg font-black uppercase italic text-[var(--color-navy-deep)] shadow-[0_8px_0_0_#2c8a2b]"
        >
          <Plus className="h-6 w-6" /> Crear sala
        </motion.button>

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/50">
          <span className="h-px flex-1 bg-white/15" /> o únete <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="flex flex-col gap-3 rounded-3xl bg-[var(--color-navy)] p-5 ring-1 ring-white/10">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CÓDIGO"
            inputMode="text"
            maxLength={4}
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-center text-2xl font-black uppercase tracking-[0.4em] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-green)]"
          />
          <motion.button
            onClick={unir}
            disabled={codigo.trim().length < 4}
            whileHover={codigo.trim().length >= 4 ? { scale: 1.03 } : undefined}
            whileTap={codigo.trim().length >= 4 ? { scale: 0.96 } : undefined}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-red)] px-6 py-3 font-extrabold text-white disabled:opacity-40"
          >
            <LogIn className="h-5 w-5" /> Unirse a la sala
          </motion.button>
        </div>
      </div>
    </main>
  );
}
