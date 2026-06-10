import { jerseyFor, type JerseyCustom } from "@/lib/avatar";

// Camiseta de fútbol en SVG generada a partir del nombre (ver lib/avatar.ts).
// `jersey` (opcional) aplica la customización elegida por el jugador (kit/patrón/dorsal).
// `ring` (opcional) dibuja un aro con el color elegido por el jugador, para que su
// identidad de color siga presente. `dim` baja la opacidad (p.ej. "aún no responde").
export function JerseyAvatar({
  nombre,
  jersey,
  size = 36,
  ring,
  dim = false,
  className = "",
}: {
  nombre: string;
  jersey?: JerseyCustom | null;
  size?: number;
  ring?: string;
  dim?: boolean;
  className?: string;
}) {
  const { primary, secondary, pattern, number } = jerseyFor(nombre, jersey);
  const id = (nombre || "j").replace(/[^a-z0-9]/gi, "") || "j";
  const clip = `clip-${id}-${number}`;
  // Silueta de camiseta con cuello en V y mangas (viewBox 0 0 48 48).
  const shirt = "M16 7 L24 11 L32 7 L43 14 L38 23 L34 21 L34 42 Q34 45 31 45 L17 45 Q14 45 14 42 L14 21 L10 23 L5 14 Z";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      style={{ opacity: dim ? 0.5 : 1, display: "block" }}
      role="img"
      aria-label={`Camiseta ${number}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={shirt} />
        </clipPath>
      </defs>
      {ring && <circle cx="24" cy="24" r="23" fill="none" stroke={ring} strokeWidth="2.5" />}
      <path d={shirt} fill={primary} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        {pattern === "stripes" &&
          [16, 22, 28].map((x) => <rect key={x} x={x} y="0" width="3.2" height="48" fill={secondary} opacity="0.9" />)}
        {pattern === "hoops" &&
          [22, 30, 38].map((y) => <rect key={y} x="0" y={y} width="48" height="3.4" fill={secondary} opacity="0.9" />)}
        {pattern === "sash" && <path d="M5 14 L43 40 L43 33 L9 11 Z" fill={secondary} opacity="0.95" />}
        {pattern === "halves" && <rect x="24" y="0" width="24" height="48" fill={secondary} opacity="0.85" />}
      </g>
      {/* Cuello y puños en color de detalle para dar remate */}
      <path d="M16 7 L24 11 L32 7 L29 13 L24 15 L19 13 Z" fill={secondary} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fontSize="15"
        fontWeight="900"
        fill="#fff"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.6"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {number}
      </text>
    </svg>
  );
}
