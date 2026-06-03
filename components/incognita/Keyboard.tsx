"use client";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import type { TileState } from "@/lib/incognita/evaluate";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const STATE_BG: Record<TileState, string> = {
  correct: "var(--color-green)",
  present: "var(--color-amber)",
  absent: "var(--color-gray-dark)",
};

function keyStyle(state?: TileState): React.CSSProperties {
  if (!state) return { backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" };
  return {
    backgroundColor: STATE_BG[state],
    color: state === "absent" ? "#fff" : "var(--color-navy-deep)",
  };
}

export function Keyboard({
  states,
  onChar,
  onEnter,
  onBackspace,
  disabled,
}: {
  states: Record<string, TileState>;
  onChar: (c: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-1.5">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5">
          {row.map((key) => {
            const special = key === "ENTER" || key === "DEL";
            const onClick = () => {
              if (disabled) return;
              if (key === "ENTER") onEnter();
              else if (key === "DEL") onBackspace();
              else onChar(key);
            };
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.88 }}
                onClick={onClick}
                disabled={disabled}
                style={special ? undefined : keyStyle(states[key])}
                className={`flex h-12 items-center justify-center rounded-md text-sm font-extrabold uppercase disabled:opacity-60 sm:h-14 ${
                  special
                    ? "min-w-[3.5rem] bg-[var(--color-navy)] px-2 text-white ring-1 ring-white/15"
                    : "min-w-[1.9rem] flex-1 sm:min-w-[2.4rem]"
                }`}
                aria-label={key === "DEL" ? "Borrar" : key === "ENTER" ? "Enviar" : key}
              >
                {key === "DEL" ? <Delete className="h-5 w-5" /> : key === "ENTER" ? "Enviar" : key}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
