"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Users } from "lucide-react";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { getGame } from "@/lib/games";

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 18 } as const },
};

export default function ModoPage() {
  const params = useParams<{ game: string }>();
  const game = getGame(params.game);

  if (!game) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <MemphisBackground />
        <p className="text-xl font-black">Juego no encontrado.</p>
        <Link href="/" className="underline">Volver al inicio</Link>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <MemphisBackground />

      <div className="flex w-full max-w-md items-center">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gray-light)]/60">{game.nombre}</p>
        <h1 className="mt-1 text-3xl font-black uppercase italic sm:text-4xl">¿Cómo quieres jugar?</h1>
      </div>

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="grid w-full max-w-md gap-4 sm:grid-cols-2"
      >
        <motion.div variants={item} whileHover={{ y: -6, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={game.solo}
            className="flex h-full flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] p-7 text-center shadow-xl ring-1 ring-white/10"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: "var(--color-green)" }}>
              <User className="h-8 w-8 text-[var(--color-navy-deep)]" />
            </span>
            <span className="text-xl font-black uppercase italic">Solo</span>
            <span className="text-sm text-[var(--color-gray-light)]/80">Juega a tu ritmo y supera tus marcas.</span>
          </Link>
        </motion.div>

        <motion.div variants={item} whileHover={{ y: -6, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={`/multijugador/${params.game}`}
            className="flex h-full flex-col items-center gap-3 rounded-3xl bg-[var(--color-navy)] p-7 text-center shadow-xl ring-1 ring-white/10"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: "var(--color-red)" }}>
              <Users className="h-8 w-8 text-white" />
            </span>
            <span className="text-xl font-black uppercase italic">Multijugador</span>
            <span className="text-sm text-[var(--color-gray-light)]/80">Compite en tiempo real con amigos por código o link.</span>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
