"use client";
import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

// Número que "cuenta" hacia su valor con un pop elástico.
// Respeta prefers-reduced-motion: en ese caso salta directo al valor final.
export function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString("es"));

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      type: "spring",
      stiffness: 200,
      damping: 22,
    });
    return () => controls.stop();
  }, [value, motionValue, reduceMotion]);

  return <motion.span>{rounded}</motion.span>;
}
