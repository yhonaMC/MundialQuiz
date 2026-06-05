"use client";
import { motion } from "framer-motion";
import { MemphisBackground } from "@/components/ui/MemphisBackground";

// Balón estilizado (pentágono central + manchas) para el loader.
function Ball() {
  return (
    <svg viewBox="0 0 64 64" width={68} height={68} aria-hidden style={{ display: "block" }}>
      <circle cx="32" cy="32" r="30" fill="#fff" stroke="var(--color-navy-deep)" strokeWidth="2.5" />
      <polygon points="32,21 42.5,28.6 38.5,40.9 25.5,40.9 21.5,28.6" fill="var(--color-navy-deep)" />
      {[-54, 18, 90, 162, 234].map((a) => {
        const r = 24;
        const x = 32 + r * Math.cos((a * Math.PI) / 180);
        const y = 32 + r * Math.sin((a * Math.PI) / 180);
        return <circle key={a} cx={x} cy={y} r="3.6" fill="var(--color-navy-deep)" />;
      })}
    </svg>
  );
}

// Indicador de carga: balón que rebota y gira sobre un resplandor pulsante. Grande y vivo.
export function Loader({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative grid h-28 w-28 place-items-center">
        <motion.div
          aria-hidden
          className="absolute h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-green) 50%, transparent), transparent 70%)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ y: [0, -16, 0], rotate: [0, 360] }}
          transition={{ y: { repeat: Infinity, duration: 0.7, ease: "easeInOut" }, rotate: { repeat: Infinity, duration: 1.8, ease: "linear" } }}
        >
          <Ball />
        </motion.div>
        <motion.div
          aria-hidden
          className="absolute bottom-1 h-2 w-14 rounded-full bg-black/40 blur-[2px]"
          animate={{ scaleX: [1, 0.65, 1], opacity: [0.5, 0.25, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
        />
      </div>
      <p className="flex items-center text-lg font-black uppercase italic tracking-wide">
        {label}
        <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }}>…</motion.span>
      </p>
    </div>
  );
}

// Pantalla completa de carga con fondo Memphis (reemplaza los textos sueltos).
export function LoaderScreen({ label }: { label?: string }) {
  return (
    <main className="relative flex flex-1 items-center justify-center p-6">
      <MemphisBackground />
      <Loader label={label} />
    </main>
  );
}
