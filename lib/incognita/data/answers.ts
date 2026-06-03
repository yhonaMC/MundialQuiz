// Banco de respuestas para "La Incógnita Mundialera".
// Palabras normalizadas (MAYÚS, sin acentos salvo Ñ), longitud 4-8.
// Cada respuesta trae una pista breve. category: jugador | seleccion.
import { PLAYERS_BANK } from "./playersBank";

export type Categoria = "jugador" | "seleccion";

export interface Respuesta {
  word: string;
  hint: string;
  category: Categoria;
}

const JUGADORES: Respuesta[] = [
  { word: "MESSI", hint: "Argentina · capitán campeón 2022", category: "jugador" },
  { word: "MARADONA", hint: "Argentina · campeón 1986", category: "jugador" },
  { word: "AGUERO", hint: "Argentina · delantero", category: "jugador" },
  { word: "HIGUAIN", hint: "Argentina · delantero", category: "jugador" },
  { word: "TEVEZ", hint: "Argentina · delantero", category: "jugador" },
  { word: "RIQUELME", hint: "Argentina · enganche", category: "jugador" },
  { word: "PELE", hint: "Brasil · tricampeón mundial", category: "jugador" },
  { word: "RONALDO", hint: "Brasil · goleador del Mundial 2002", category: "jugador" },
  { word: "NEYMAR", hint: "Brasil · estrella ofensiva", category: "jugador" },
  { word: "CASEMIRO", hint: "Brasil · mediocampista", category: "jugador" },
  { word: "ALISSON", hint: "Brasil · portero", category: "jugador" },
  { word: "ZIDANE", hint: "Francia · campeón 1998", category: "jugador" },
  { word: "MBAPPE", hint: "Francia · goleador de la final 2022", category: "jugador" },
  { word: "BENZEMA", hint: "Francia · Balón de Oro 2022", category: "jugador" },
  { word: "POGBA", hint: "Francia · campeón 2018", category: "jugador" },
  { word: "KANTE", hint: "Francia · mediocampista campeón 2018", category: "jugador" },
  { word: "GIROUD", hint: "Francia · goleador histórico", category: "jugador" },
  { word: "MODRIC", hint: "Croacia · Balón de Oro 2018", category: "jugador" },
  { word: "SUAREZ", hint: "Uruguay · delantero", category: "jugador" },
  { word: "CAVANI", hint: "Uruguay · delantero", category: "jugador" },
  { word: "FORLAN", hint: "Uruguay · Balón de Oro 2010", category: "jugador" },
  { word: "INIESTA", hint: "España · gol del título 2010", category: "jugador" },
  { word: "XAVI", hint: "España · cerebro campeón 2010", category: "jugador" },
  { word: "PIQUE", hint: "España · defensa central", category: "jugador" },
  { word: "RAMOS", hint: "España · capitán defensa", category: "jugador" },
  { word: "TORRES", hint: "España · delantero campeón 2010", category: "jugador" },
  { word: "MULLER", hint: "Alemania · campeón 2014", category: "jugador" },
  { word: "KROOS", hint: "Alemania · mediocampista campeón 2014", category: "jugador" },
  { word: "KLOSE", hint: "Alemania · máximo goleador en Mundiales", category: "jugador" },
  { word: "NEUER", hint: "Alemania · portero campeón 2014", category: "jugador" },
  { word: "LAHM", hint: "Alemania · capitán campeón 2014", category: "jugador" },
  { word: "OZIL", hint: "Alemania · enganche campeón 2014", category: "jugador" },
  { word: "KANE", hint: "Inglaterra · capitán y goleador", category: "jugador" },
  { word: "ROONEY", hint: "Inglaterra · delantero histórico", category: "jugador" },
  { word: "ROBBEN", hint: "Países Bajos · extremo veloz", category: "jugador" },
  { word: "SNEIJDER", hint: "Países Bajos · subcampeón 2010", category: "jugador" },
  { word: "PERSIE", hint: "Países Bajos · delantero (van Persie)", category: "jugador" },
  { word: "DROGBA", hint: "Costa de Marfil · delantero", category: "jugador" },
  { word: "SALAH", hint: "Egipto · estrella ofensiva", category: "jugador" },
  { word: "MANE", hint: "Senegal · extremo", category: "jugador" },
  { word: "HAZARD", hint: "Bélgica · extremo", category: "jugador" },
  { word: "LUKAKU", hint: "Bélgica · goleador", category: "jugador" },
  { word: "BRUYNE", hint: "Bélgica · mediocampista (De Bruyne)", category: "jugador" },
  { word: "HAALAND", hint: "Noruega · goleador (Mundial 2026)", category: "jugador" },
  { word: "VIDAL", hint: "Chile · mediocampista", category: "jugador" },
  { word: "SANCHEZ", hint: "Chile · delantero (Alexis)", category: "jugador" },
  { word: "FALCAO", hint: "Colombia · delantero", category: "jugador" },
  { word: "JAMES", hint: "Colombia · Bota de Oro 2014", category: "jugador" },
  { word: "OCHOA", hint: "México · portero histórico", category: "jugador" },
];

const SELECCIONES: Respuesta[] = [
  { word: "BRASIL", hint: "Selección · pentacampeona del mundo", category: "seleccion" },
  { word: "FRANCIA", hint: "Selección · campeona 1998 y 2018", category: "seleccion" },
  { word: "ESPAÑA", hint: "Selección · campeona 2010", category: "seleccion" },
  { word: "ITALIA", hint: "Selección · tetracampeona mundial", category: "seleccion" },
  { word: "URUGUAY", hint: "Selección · campeona del primer Mundial (1930)", category: "seleccion" },
  { word: "ALEMANIA", hint: "Selección · tetracampeona mundial", category: "seleccion" },
  { word: "MEXICO", hint: "Selección · anfitriona en 1970, 1986 y 2026", category: "seleccion" },
  { word: "CANADA", hint: "Selección · coanfitriona del Mundial 2026", category: "seleccion" },
  { word: "CROACIA", hint: "Selección · subcampeona 2018", category: "seleccion" },
  { word: "HOLANDA", hint: "Selección · subcampeona en tres finales", category: "seleccion" },
  { word: "PORTUGAL", hint: "Selección · campeona de Europa 2016", category: "seleccion" },
  { word: "COLOMBIA", hint: "Selección · los Cafeteros", category: "seleccion" },
  { word: "PARAGUAY", hint: "Selección · la Albirroja", category: "seleccion" },
  { word: "ECUADOR", hint: "Selección · la Tri", category: "seleccion" },
  { word: "BOLIVIA", hint: "Selección · andina", category: "seleccion" },
  { word: "CHILE", hint: "Selección · la Roja", category: "seleccion" },
  { word: "PERU", hint: "Selección · la Blanquirroja", category: "seleccion" },
  { word: "JAPON", hint: "Selección · asiática", category: "seleccion" },
  { word: "COREA", hint: "Selección · coanfitriona del Mundial 2002", category: "seleccion" },
  { word: "IRAN", hint: "Selección · asiática", category: "seleccion" },
  { word: "GHANA", hint: "Selección · las Estrellas Negras", category: "seleccion" },
  { word: "NIGERIA", hint: "Selección · las Súper Águilas", category: "seleccion" },
  { word: "SENEGAL", hint: "Selección · los Leones de Teranga", category: "seleccion" },
  { word: "ARGELIA", hint: "Selección · africana", category: "seleccion" },
  { word: "EGIPTO", hint: "Selección · los Faraones", category: "seleccion" },
  { word: "TUNEZ", hint: "Selección · africana", category: "seleccion" },
  { word: "CAMERUN", hint: "Selección · los Leones Indomables", category: "seleccion" },
  { word: "BELGICA", hint: "Selección · los Diablos Rojos", category: "seleccion" },
  { word: "POLONIA", hint: "Selección · europea", category: "seleccion" },
  { word: "SUECIA", hint: "Selección · nórdica", category: "seleccion" },
  { word: "NORUEGA", hint: "Selección · nórdica", category: "seleccion" },
  { word: "ESCOCIA", hint: "Selección · británica", category: "seleccion" },
  { word: "GALES", hint: "Selección · británica", category: "seleccion" },
  { word: "RUSIA", hint: "Selección · anfitriona del Mundial 2018", category: "seleccion" },
  { word: "CATAR", hint: "Selección · anfitriona del Mundial 2022", category: "seleccion" },
  { word: "PANAMA", hint: "Selección · de Concacaf", category: "seleccion" },
  { word: "HONDURAS", hint: "Selección · de Concacaf", category: "seleccion" },
  { word: "AUSTRIA", hint: "Selección · europea", category: "seleccion" },
  { word: "HUNGRIA", hint: "Selección · subcampeona 1938 y 1954", category: "seleccion" },
];

// Banco grande de jugadores generado del dataset (apellido + pista auto).
const CURATED: readonly Respuesta[] = [...SELECCIONES, ...JUGADORES];
const curatedWords = new Set(CURATED.map((a) => a.word));

// Curados primero (mejores pistas), luego el banco generado sin duplicar palabras.
export const ANSWERS: readonly Respuesta[] = [
  ...CURATED,
  ...PLAYERS_BANK.filter((p) => !curatedWords.has(p.word)),
];
