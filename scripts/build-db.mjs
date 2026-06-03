import fs from "node:fs";

// ---- helpers ----
function normalize(s) {
  if (!s) return "";
  let out = "";
  for (const ch of s.toUpperCase()) {
    if (ch === "Ñ") { out += "Ñ"; continue; }
    out += ch.normalize("NFD").replace(/\p{M}/gu, "");
  }
  return out;
}
function surnameToken(p) {
  const base = p.lastNames || p.nameOnShirt || p.officialPlayerName || "";
  const t = base.split(/[\s'-]+/).filter(Boolean);
  return t.length ? t[t.length - 1] : "";
}

const PAIS = {
  Argentina: "Argentina", Brazil: "Brasil", France: "Francia", Germany: "Alemania",
  "West Germany": "Alemania Occidental", "East Germany": "Alemania Oriental", Spain: "España",
  Italy: "Italia", England: "Inglaterra", Netherlands: "Países Bajos", Portugal: "Portugal",
  Belgium: "Bélgica", Croatia: "Croacia", Uruguay: "Uruguay", Mexico: "México",
  "United States": "Estados Unidos", USA: "Estados Unidos", Colombia: "Colombia", Chile: "Chile",
  Peru: "Perú", Paraguay: "Paraguay", Ecuador: "Ecuador", Bolivia: "Bolivia", Venezuela: "Venezuela",
  Japan: "Japón", "Korea Republic": "Corea del Sur", "South Korea": "Corea del Sur",
  "North Korea": "Corea del Norte", "Saudi Arabia": "Arabia Saudita", Iran: "Irán", "IR Iran": "Irán",
  Iraq: "Irak", Qatar: "Catar", Australia: "Australia", China: "China", Kuwait: "Kuwait",
  "United Arab Emirates": "Emiratos Árabes", Jordan: "Jordania", Uzbekistan: "Uzbekistán",
  Ghana: "Ghana", Nigeria: "Nigeria", Senegal: "Senegal", Cameroon: "Camerún",
  "Ivory Coast": "Costa de Marfil", "Côte D'Ivoire": "Costa de Marfil", Algeria: "Argelia",
  Morocco: "Marruecos", Tunisia: "Túnez", Egypt: "Egipto", "South Africa": "Sudáfrica",
  Angola: "Angola", Togo: "Togo", Zaire: "Zaire", "Congo DR": "RD del Congo", "Cabo Verde": "Cabo Verde",
  Sweden: "Suecia", Norway: "Noruega", Denmark: "Dinamarca", Switzerland: "Suiza", Austria: "Austria",
  Poland: "Polonia", Russia: "Rusia", "Soviet Union": "Unión Soviética", Ukraine: "Ucrania",
  Serbia: "Serbia", "Serbia and Montenegro": "Serbia y Montenegro", Yugoslavia: "Yugoslavia",
  Czechia: "Chequia", "Czech Republic": "Chequia", Czechoslovakia: "Checoslovaquia", Hungary: "Hungría",
  Romania: "Rumanía", Bulgaria: "Bulgaria", Greece: "Grecia", Turkey: "Turquía", "Türkiye": "Turquía",
  Scotland: "Escocia", Wales: "Gales", "Northern Ireland": "Irlanda del Norte",
  "Republic of Ireland": "Irlanda", Iceland: "Islandia", Slovenia: "Eslovenia", Slovakia: "Eslovaquia",
  "Bosnia And Herzegovina": "Bosnia y Herzegovina", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  Canada: "Canadá", "Costa Rica": "Costa Rica", Honduras: "Honduras", Panama: "Panamá",
  Jamaica: "Jamaica", "Trinidad and Tobago": "Trinidad y Tobago", "El Salvador": "El Salvador",
  Haiti: "Haití", Cuba: "Cuba", Curaçao: "Curazao", "New Zealand": "Nueva Zelanda",
  "Dutch East Indies": "Indias Orientales Neerlandesas", Israel: "Israel",
};
const CONMEBOL = ["Argentina","Brazil","Uruguay","Chile","Colombia","Peru","Paraguay","Ecuador","Bolivia","Venezuela"];
const CONCACAF = ["Mexico","United States","USA","Canada","Costa Rica","Honduras","Panama","Jamaica","Trinidad and Tobago","El Salvador","Haiti","Cuba","Curaçao"];
const CAF = ["Algeria","Morocco","Tunisia","Egypt","Nigeria","Ghana","Senegal","Cameroon","Ivory Coast","Côte D'Ivoire","South Africa","Angola","Togo","Zaire","Congo DR","Cabo Verde"];
const AFC = ["Japan","South Korea","North Korea","Korea Republic","Saudi Arabia","Iran","IR Iran","Iraq","Qatar","China","Kuwait","Australia","United Arab Emirates","Jordan","Uzbekistan","Dutch East Indies","Israel"];
const OFC = ["New Zealand"];
function confederacion(team) {
  if (CONMEBOL.includes(team)) return "CONMEBOL";
  if (CONCACAF.includes(team)) return "CONCACAF";
  if (CAF.includes(team)) return "CAF";
  if (AFC.includes(team)) return "AFC";
  if (OFC.includes(team)) return "OFC";
  return "UEFA"; // por defecto europeo (cubre el resto del set)
}
const POS = { GK: "Portero", DF: "Defensa", MF: "Mediocampista", FW: "Delantero" };
const paisEs = (t) => PAIS[t] || t;

// ---- cargar fuentes ----
const PLAYERS = JSON.parse(fs.readFileSync("data-sources/fifa-world-cup-men-players-1930-2026.flat.json", "utf8")).players;
const TOURN = JSON.parse(fs.readFileSync("data-sources/fifa-world-cup-men-squads-1930-2026.grouped.json", "utf8")).tournaments;

// ---- tournaments ----
const winners = {}; // year -> winner (EN)
const tournaments = TOURN.map((t) => {
  winners[t.year] = t.winner || null;
  return {
    year: t.year,
    sedeEs: t.hostCountry,
    campeonEs: t.winner ? paisEs(t.winner) : null,
    equipos: t.teamCount,
  };
}).sort((a, b) => a.year - b.year);

// ---- teams ----
const teamSet = new Map(); // name -> code
for (const t of TOURN) for (const tm of t.teams) if (!teamSet.has(tm.name)) teamSet.set(tm.name, tm.code);
const teams = [...teamSet.entries()].map(([name, code]) => ({
  code,
  nombreEs: paisEs(name),
  confederacion: confederacion(name),
})).sort((a, b) => a.nombreEs.localeCompare(b.nombreEs));

// ---- players (agrupados por playerId) ----
const byId = new Map();
for (const p of PLAYERS) {
  const cur = byId.get(p.playerId) || {
    id: p.playerId, nombre: p.officialPlayerName, entries: [], nacimiento: p.dateOfBirth ? Number(p.dateOfBirth.slice(0, 4)) : null,
  };
  cur.entries.push({ year: p.tournamentYear, team: p.teamName, pos: p.position });
  byId.set(p.playerId, cur);
}
const players = [];
for (const p of byId.values()) {
  const years = [...new Set(p.entries.map((e) => e.year))].sort((a, b) => a - b);
  const last = p.entries.reduce((a, b) => (b.year >= a.year ? b : a));
  const campeon = p.entries.some((e) => winners[e.year] && winners[e.year] === e.team);
  players.push({
    id: p.id,
    nombre: p.nombre,
    apellido: normalize(surnameToken({ officialPlayerName: p.nombre })),
    paisEs: paisEs(last.team),
    confederacion: confederacion(last.team),
    posicion: POS[last.pos] || "Jugador",
    mundiales: years,
    campeon,
    nacimiento: p.nacimiento,
  });
}
// subconjunto jugable por notoriedad: más Mundiales, luego más reciente.
players.sort((a, b) => b.mundiales.length - a.mundiales.length || b.mundiales.at(-1) - a.mundiales.at(-1));
const subset = players.slice(0, 1500);

const write = (file, name, type, data) =>
  fs.writeFileSync(
    `lib/db/${file}`,
    `// AUTO-GENERADO por scripts/build-db.mjs — no editar a mano.\n` +
      `import type { ${type} } from "./types";\n` +
      `export const ${name}: readonly ${type}[] = ${JSON.stringify(data)};\n`,
  );
write("tournaments.ts", "TOURNAMENTS", "Tournament", tournaments);
write("teams.ts", "TEAMS", "Team", teams);
write("players.ts", "PLAYERS", "Player", subset);

console.log("DB:", subset.length, "jugadores |", teams.length, "selecciones |", tournaments.length, "torneos");
