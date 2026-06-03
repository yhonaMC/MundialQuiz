import Link from "next/link";

// Footer global: siempre al fondo (el <body> es flex-col y el <main> es flex-1).
export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 px-4 py-6 text-center">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-[var(--color-gray-light)]/60">
        <Link href="/" className="hover:text-white">
          Inicio
        </Link>
        <span className="text-white/20">·</span>
        <Link href="/privacidad" className="hover:text-white">
          Política de Privacidad
        </Link>
      </nav>
      <p className="mt-2 text-[10px] text-[var(--color-gray-light)]/40">
        JuegaMundial · Juegos de los Mundiales 1930–2026
      </p>
    </footer>
  );
}
