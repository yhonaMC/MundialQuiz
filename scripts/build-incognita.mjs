import fs from "node:fs";

// Normaliza a MAYÚSCULAS, sin acentos, conservando Ñ como letra. Solo A-Z y Ñ.
// Misma lógica que lib/incognita/normalize.ts (mantener en sync).
export function normalize(s) {
  if (!s) return "";
  let out = "";
  for (const ch of s.toUpperCase()) {
    if (ch === "Ñ") { out += "Ñ"; continue; }
    out += ch.normalize("NFD").replace(/\p{M}/gu, "");
  }
  return out;
}

const PLAYERS = JSON.parse(
  fs.readFileSync("data-sources/fifa-world-cup-men-players-1930-2026.flat.json", "utf8"),
).players;

function surnameToken(p) {
  const base = p.lastNames || p.nameOnShirt || p.officialPlayerName || "";
  const tokens = base.split(/[\s'-]+/).filter(Boolean);
  return tokens.length ? tokens[tokens.length - 1] : "";
}

// ---- 1) Diccionario de intentos válidos (todos los apellidos 4-8) ----
const valid = new Set();
for (const p of PLAYERS) {
  const w = normalize(surnameToken(p));
  if (/^[A-ZÑ]{4,8}$/.test(w)) valid.add(w);
}
const arr = [...valid].sort();
fs.writeFileSync(
  "lib/incognita/data/validGuesses.ts",
  "// AUTO-GENERADO por scripts/build-incognita.mjs — no editar a mano.\n" +
    "// Apellidos reales de mundialistas (1930-2026), normalizados (MAYÚS, sin acentos, con Ñ), 4-8 letras.\n" +
    "export const VALID_SURNAMES: readonly string[] = " + JSON.stringify(arr) + ";\n",
);

// ---- 2) Banco de respuestas de jugadores (apellido + pista auto) ----
const POS = { GK: "Portero", DF: "Defensa", MF: "Mediocampista", FW: "Delantero" };
const PAIS = {
  Argentina: "Argentina", Brazil: "Brasil", France: "Francia", Germany: "Alemania",
  "West Germany": "Alemania Occidental", "East Germany": "Alemania Oriental", Spain: "España",
  Italy: "Italia", England: "Inglaterra", Netherlands: "Países Bajos", Portugal: "Portugal",
  Belgium: "Bélgica", Croatia: "Croacia", Uruguay: "Uruguay", Mexico: "México",
  "United States": "Estados Unidos", USA: "Estados Unidos", Colombia: "Colombia",
  Chile: "Chile", Peru: "Perú", Paraguay: "Paraguay", Ecuador: "Ecuador", Bolivia: "Bolivia",
  Japan: "Japón", "Korea Republic": "Corea del Sur", "South Korea": "Corea del Sur",
  "North Korea": "Corea del Norte", "Saudi Arabia": "Arabia Saudita", Iran: "Irán",
  "IR Iran": "Irán", Iraq: "Irak", Qatar: "Catar", Australia: "Australia", China: "China",
  Ghana: "Ghana", Nigeria: "Nigeria", Senegal: "Senegal", Cameroon: "Camerún",
  "Ivory Coast": "Costa de Marfil", "Côte D'Ivoire": "Costa de Marfil", Algeria: "Argelia",
  Morocco: "Marruecos", Tunisia: "Túnez", Egypt: "Egipto", "South Africa": "Sudáfrica",
  Sweden: "Suecia", Norway: "Noruega", Denmark: "Dinamarca", Switzerland: "Suiza",
  Austria: "Austria", Poland: "Polonia", Russia: "Rusia", "Soviet Union": "Unión Soviética",
  Ukraine: "Ucrania", Serbia: "Serbia", Yugoslavia: "Yugoslavia", Czechia: "Chequia",
  "Czech Republic": "Chequia", Czechoslovakia: "Checoslovaquia", Hungary: "Hungría",
  Romania: "Rumanía", Bulgaria: "Bulgaria", Greece: "Grecia", Turkey: "Turquía",
  "Türkiye": "Turquía", Scotland: "Escocia", Wales: "Gales", "Northern Ireland": "Irlanda del Norte",
  "Republic of Ireland": "Irlanda", Iceland: "Islandia", Slovenia: "Eslovenia",
  Slovakia: "Eslovaquia", Canada: "Canadá", "Costa Rica": "Costa Rica", Honduras: "Honduras",
  Panama: "Panamá", Jamaica: "Jamaica", "Trinidad and Tobago": "Trinidad y Tobago",
  "New Zealand": "Nueva Zelanda", "Cabo Verde": "Cabo Verde", "Congo DR": "RD del Congo",
  Curaçao: "Curazao", Haiti: "Haití", Jordan: "Jordania", Uzbekistan: "Uzbekistán",
};

const info = new Map(); // surname -> { count, year, pos, team }
for (const p of PLAYERS) {
  const w = normalize(surnameToken(p));
  if (!/^[A-ZÑ]{4,8}$/.test(w)) continue;
  const cur = info.get(w) || { count: 0, year: 0, pos: p.position, team: p.teamName };
  cur.count += 1;
  if ((p.tournamentYear ?? 0) >= cur.year) {
    cur.year = p.tournamentYear;
    cur.pos = p.position;
    cur.team = p.teamName;
  }
  info.set(w, cur);
}

// Ranking por notoriedad: más apariciones, luego más reciente.
const ranked = [...info.entries()]
  .sort((a, b) => b[1].count - a[1].count || b[1].year - a[1].year)
  .slice(0, 540);

const bank = ranked.map(([w, d]) => {
  const pos = POS[d.pos] || "Jugador";
  const pais = PAIS[d.team] || d.team;
  return { word: w, hint: `Jugador · ${pos} · ${pais} · ${d.year}`, category: "jugador" };
});

fs.writeFileSync(
  "lib/incognita/data/playersBank.ts",
  "// AUTO-GENERADO por scripts/build-incognita.mjs — no editar a mano.\n" +
    "// Banco de jugadores (apellido normalizado 4-8 + pista) ordenado por notoriedad.\n" +
    'import type { Respuesta } from "./answers";\n' +
    "export const PLAYERS_BANK: readonly Respuesta[] = " + JSON.stringify(bank) + ";\n",
);

console.log("validGuesses:", arr.length, "| playersBank:", bank.length);
