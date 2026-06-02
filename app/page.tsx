import Link from "next/link";
import { MODES } from "@/lib/modes/modes";
import { MemphisBackground } from "@/components/ui/MemphisBackground";
import { ModeCard } from "@/components/ModeCard";
import { TOURNAMENT_YEARS } from "@/lib/data";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      <MemphisBackground />

      <h1 className="text-center text-4xl font-black sm:text-5xl">
        Mundial<span className="text-[var(--color-gold)]">Quiz</span>
      </h1>
      <p className="mt-2 text-center text-white/70">Trivia de los Mundiales 1998 – 2022</p>

      <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => {
          // "Por Mundial" lleva primero a elegir el año.
          const href = mode.id === "por-mundial" ? "/play/por-mundial" : `/play/${mode.id}`;
          return <ModeCard key={mode.id} mode={mode} href={href} />;
        })}
      </div>

      <p className="mt-10 text-xs text-white/50">
        Ediciones disponibles: {TOURNAMENT_YEARS.join(" · ")}
      </p>

      <Link href="#" className="sr-only">
        Inicio
      </Link>
    </main>
  );
}
