import type { Question } from "@/lib/data/types";
import { TEAMS } from "@/lib/db/teams";
import { PLAYERS } from "@/lib/db/players";

// Pista de texto que NO revela la respuesta: deriva un dato del equipo/jugador
// correcto (confederación / posición + país) o, si no hay, el tema de la pregunta.
// Pensada para ofrecerse a cambio de menos puntos.
export function questionHint(q: Question): string {
  const ans = q.options && q.answerIndex != null ? q.options[q.answerIndex] : undefined;
  if (ans) {
    const team = TEAMS.find((t) => t.nombreEs === ans);
    if (team) return `El equipo correcto es de ${team.confederacion}`;
    const pl = PLAYERS.find((p) => p.nombre === ans);
    if (pl) return `Es ${pl.posicion.toLowerCase()} de ${pl.paisEs}`;
  }
  const tema = q.tags.filter((t) => t !== "verdadero-falso" && t !== "número" && t !== "descarta").join(" · ");
  return tema ? `Tema: ${tema}` : "Piensa en el contexto de ese Mundial";
}
