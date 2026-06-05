"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "@/components/ui/Confetti";

type Variant = "start" | "win" | "lose";
export interface AnnounceData {
  id: number;
  text: string;
  sub?: string;
  variant: Variant;
}

const COLORS: Record<Variant, string> = {
  start: "var(--color-green)",
  win: "var(--color-amber)",
  lose: "var(--color-red)",
};

// Anuncio grande y flotante en el centro con efectos de fondo (rayos + resplandor).
// `fire(text, { variant, sub, ms })` lo muestra y lo oculta solo.
export function useAnnounce() {
  const [announce, setAnnounce] = useState<AnnounceData | null>(null);
  const idRef = useRef(0);
  const fire = useCallback((text: string, opts?: { variant?: Variant; sub?: string; ms?: number }) => {
    const id = ++idRef.current;
    setAnnounce({ id, text, sub: opts?.sub, variant: opts?.variant ?? "start" });
    const ms = opts?.ms ?? 1800;
    window.setTimeout(() => setAnnounce((d) => (d && d.id === id ? null : d)), ms);
  }, []);
  return { announce, fire };
}

export function Announce({ data }: { data: AnnounceData | null }) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.id}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at center, color-mix(in srgb, ${COLORS[data.variant]} 38%, transparent), transparent 62%)` }}
          />
          <motion.div
            aria-hidden
            className="absolute h-[140vmax] w-[140vmax] opacity-[0.18]"
            style={{ background: `repeating-conic-gradient(from 0deg, ${COLORS[data.variant]} 0deg 10deg, transparent 10deg 20deg)` }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
          />
          {data.variant === "win" && <Confetti pieces={90} />}
          <motion.div
            initial={{ scale: 0.3, y: 24, rotate: -6 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 13 }}
            className="relative flex flex-col items-center gap-2 px-8"
          >
            <span
              className="text-center text-5xl font-black uppercase italic sm:text-7xl"
              style={{ color: COLORS[data.variant], textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}
            >
              {data.text}
            </span>
            {data.sub && <span className="text-center text-lg font-extrabold text-white">{data.sub}</span>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
