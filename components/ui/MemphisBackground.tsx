// Fondo decorativo geométrico estilo Memphis. Puramente visual (aria-hidden).
export function MemphisBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--color-indigo-deep)]">
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[var(--color-magenta)] opacity-20 blur-2xl" />
      <div className="absolute right-0 top-1/3 h-52 w-52 rounded-full bg-[var(--color-cyan-pop)] opacity-15 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-44 w-44 rounded-full bg-[var(--color-gold)] opacity-15 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
