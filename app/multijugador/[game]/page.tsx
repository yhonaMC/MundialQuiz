"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, LogIn } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { getGame } from "@/lib/games";

// Código de sala de 4 caracteres (sin caracteres ambiguos).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function nuevoCodigo(): string {
  let c = "";
  for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

export default function MultijugadorPage() {
  const params = useParams<{ game: string }>();
  const router = useRouter();
  const game = getGame(params.game);
  const [codigo, setCodigo] = useState("");

  if (!game) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <p className="text-xl font-black">Juego no encontrado.</p>
        <Link href="/" className="underline">Volver al inicio</Link>
      </main>
    );
  }

  const crear = () => router.push(`/sala/${nuevoCodigo()}?game=${params.game}&host=1`);
  const unir = () => {
    const c = codigo.trim().toUpperCase();
    if (c.length >= 4) router.push(`/sala/${c}?game=${params.game}`);
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <MemphisBackground />

      <div className="flex w-full max-w-md items-center">
        <Link href={`/jugar/${params.game}`} className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Link>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">{game.nombre}</p>
        <h1 className="mt-1 text-3xl font-black uppercase italic sm:text-4xl">Multijugador</h1>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        {/* Crear sala */}
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

        {/* Unirse con código */}
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
