"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "gold";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-magenta)] text-white",
  gold: "bg-[var(--color-gold)] text-[var(--color-indigo-deep)]",
  ghost: "bg-white/10 text-white border border-white/20",
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
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-6 py-3 font-extrabold shadow-lg disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
