"use client";
import { AnimatePresence, motion } from "framer-motion";

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl bg-white px-5 py-3 text-center font-extrabold text-[var(--color-navy-deep)] shadow-2xl"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
