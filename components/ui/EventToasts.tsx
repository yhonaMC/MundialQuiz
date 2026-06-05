"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sfx } from "@/lib/sound";

export interface ToastItem {
  id: number;
  msg: string;
  icon?: string;
}

// Cola de toasts de eventos (apila hasta 3, autodescarta a los ~2.6s).
// `push(msg, { icon, silent })`. Por defecto suena un blip de notificación.
export function useEventToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((msg: string, opts?: { icon?: string; silent?: boolean }) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, icon: opts?.icon }].slice(-3));
    if (!opts?.silent) sfx.notify();
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return { toasts, push };
}

export function EventToasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-50 flex w-max max-w-[90vw] -translate-x-1/2 flex-col items-center gap-1.5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-extrabold text-[var(--color-navy-deep)] shadow-2xl"
          >
            {t.icon && <span className="mr-1">{t.icon}</span>}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
