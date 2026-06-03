"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { sfx } from "@/lib/sound";

type Variant = "primary" | "accent" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-green)] text-[var(--color-navy-deep)] shadow-[0_8px_0_0_#2c8a2b]",
  accent: "bg-[var(--color-red)] text-white shadow-[0_8px_0_0_#a8141a]",
  ghost: "bg-white/10 text-white border border-white/20 shadow-lg",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      onClick={
        onClick
          ? () => {
              sfx.tap();
              onClick();
            }
          : undefined
      }
      disabled={disabled}
      className={`rounded-2xl px-6 py-3 font-extrabold disabled:opacity-50 disabled:shadow-none ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
