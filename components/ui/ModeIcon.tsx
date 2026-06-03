import { Brain, Flag, Globe, Heart, Timer, TrendingUp, Trophy, type LucideIcon } from "lucide-react";

// Registro que traduce la clave semántica de cada modo (GameMode.icon)
// a un icono de lucide-react. Único punto donde el dato se acopla a la librería.
const REGISTRY: Record<string, LucideIcon> = {
  trophy: Trophy,
  timer: Timer,
  heart: Heart,
  ladder: TrendingUp, // "escalera" → progresión ascendente
  globe: Globe,
  brain: Brain,
  flag: Flag,
};

export function ModeIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = REGISTRY[name] ?? Trophy;
  return <Icon className={className} strokeWidth={2.5} aria-hidden />;
}
