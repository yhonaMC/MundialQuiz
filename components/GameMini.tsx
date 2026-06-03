"use client";
import { User } from "lucide-react";
import { conFoto } from "@/lib/db/queries";

const FOTOS = conFoto();

function Avatar({ src, className, ring }: { src?: string; className: string; ring?: boolean }) {
  return (
    <span className={`block overflow-hidden bg-white/10 ${className} ${ring ? "ring-2 ring-[var(--color-green)]" : "ring-1 ring-white/15"}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnail local
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <User className="h-1/2 w-1/2 text-white/40" />
        </span>
      )}
    </span>
  );
}

// Mini-visual de cada juego (compartido entre el hub Solo y el lobby).
export function GameMini({ game, small }: { game: string; small?: boolean }) {
  if (game === "quiz") {
    return (
      <div className={`flex flex-col gap-1 ${small ? "w-24" : "w-36"}`}>
        {[true, false, false].map((hl, i) => (
          <span
            key={i}
            className={`rounded-md text-center font-black tracking-widest ${small ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[11px]"}`}
            style={{ backgroundColor: hl ? "var(--color-green)" : "rgba(255,255,255,0.12)", color: hl ? "var(--color-navy-deep)" : "#fff" }}
          >
            ???
          </span>
        ))}
      </div>
    );
  }
  if (game === "incognita") {
    const tiles: [string, string, string][] = [
      ["M", "var(--color-green)", "var(--color-navy-deep)"],
      ["E", "var(--color-amber)", "var(--color-navy-deep)"],
      ["S", "rgba(255,255,255,0.25)", "#fff"],
    ];
    const s = small ? "h-7 w-7 text-sm" : "h-11 w-11 text-xl";
    return (
      <div className="flex gap-1.5">
        {tiles.map(([l, bg, fg], i) => (
          <span key={i} className={`grid place-items-center rounded-lg font-black ${s}`} style={{ backgroundColor: bg, color: fg }}>
            {l}
          </span>
        ))}
      </div>
    );
  }
  if (game === "conexion") {
    const f = FOTOS.slice(0, 6);
    const connected = new Set([0, 2, 4]);
    const s = small ? "h-6 w-6 rounded-md" : "h-9 w-9 rounded-lg";
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Avatar key={i} src={f[i]?.foto?.archivo} ring={connected.has(i)} className={s} />
        ))}
      </div>
    );
  }
  if (game === "penales") {
    // Balón apuntando al arco.
    return (
      <div className="flex items-center gap-2">
        <span className={`rounded-full bg-white ${small ? "h-7 w-7" : "h-10 w-10"}`} />
        <span className={`grid place-items-center rounded-md border-2 border-white/50 font-black text-white ${small ? "h-7 w-10 text-[8px]" : "h-10 w-14 text-[10px]"}`}>
          GOL
        </span>
      </div>
    );
  }

  // quien-es
  const s = small ? "h-10 w-10" : "h-12 w-12";
  return (
    <div className="relative">
      <Avatar src={FOTOS[0]?.foto?.archivo} className={`${s} rounded-full`} />
      <span className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-[var(--color-green)] font-black text-[var(--color-navy-deep)] ring-2 ring-[var(--color-navy)] ${small ? "h-5 w-5 text-xs" : "h-6 w-6 text-sm"}`}>
        ?
      </span>
    </div>
  );
}
