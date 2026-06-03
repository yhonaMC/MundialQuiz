// Descarga fotos de jugadores: Wikidata (P18) -> Commons (thumb + licencia/autor).
// Reanudable (caché en disco), con throttle y backoff. Pensado para correr en LOCAL.
//
// Uso:
//   node scripts/build-images.mjs            (correo ya incluido en el User-Agent)
//   opciones: --limit N (probar con pocos)   --delay 800 (ms entre jugadores)
//   override opcional del contacto: WIKI_CONTACT="otro@correo.com" node scripts/build-images.mjs
//
// Salidas:
//   public/players/<id>.<ext>   imágenes descargadas
//   lib/db/photos.ts            manifiesto playerId -> { archivo, autor, licencia, fuente }
//   scripts/.cache/images.json  caché (re-correr no vuelve a pedir lo ya resuelto)

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const LIMIT = Number(opt("limit", "0")) || Infinity;
const DELAY = Number(opt("delay", "800"));
const CONTACT = process.env.WIKI_CONTACT || "rlozada808@gmail.com";
const UA = `JuegaMundial/1.0 (${CONTACT}) image-fetch`;

const FOOTBALLER = "Q937857"; // association football player
const CACHE_DIR = "scripts/.cache";
const CACHE_FILE = `${CACHE_DIR}/images.json`;
const OUT_DIR = "public/players";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch JSON con reintentos y backoff ante rate-limit / errores transitorios.
async function getJSON(url, tries = 5) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
      const text = await res.text();
      if (res.status === 429 || /you are making too many requests/i.test(text)) {
        const wait = 2000 * attempt;
        console.warn(`  rate-limit, espero ${wait}ms…`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return JSON.parse(text);
    } catch (e) {
      if (attempt === tries) throw e;
      await sleep(1500 * attempt);
    }
  }
}

function loadPlayers() {
  const src = fs.readFileSync("lib/db/players.ts", "utf8");
  // Ojo: el "[" del array va DESPUÉS del "=" (la anotación "Player[]" también tiene "[").
  const start = src.indexOf("[", src.indexOf("="));
  return JSON.parse(src.slice(start, src.lastIndexOf("]") + 1));
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const yearOf = (claims) => {
  const t = claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
  return t ? Number(t.slice(1, 5)) : null;
};

// Resuelve el mejor QID para (nombre, añoNac) y devuelve el archivo P18.
async function resolve(player) {
  const search = await getJSON(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(player.nombre)}&language=es&uselang=es&type=item&limit=7&format=json&origin=*`,
  );
  const ids = (search.search || []).map((r) => r.id);
  if (!ids.length) return null;

  const ent = await getJSON(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=claims&format=json&origin=*`,
  );
  let best = null;
  for (const id of ids) {
    const claims = ent.entities?.[id]?.claims;
    const p18 = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!p18) continue;
    const isFootballer = (claims?.P106 || []).some(
      (c) => c.mainsnak?.datavalue?.value?.id === FOOTBALLER,
    );
    const by = yearOf(claims);
    const yearMatch = player.nacimiento != null && by != null && Math.abs(by - player.nacimiento) <= 1;
    const score = (isFootballer ? 2 : 0) + (yearMatch ? 3 : 0);
    if (!best || score > best.score) best = { id, p18, score };
  }
  return best;
}

async function commons(file) {
  const data = await getJSON(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json&origin=*`,
  );
  const page = Object.values(data.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const md = info.extmetadata || {};
  const clean = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    thumburl: info.thumburl,
    autor: clean(md.Artist?.value) || "Desconocido",
    licencia: clean(md.LicenseShortName?.value) || "?",
  };
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

function writeManifest(cache) {
  const photos = {};
  for (const [id, v] of Object.entries(cache)) {
    if (v.status === "ok") photos[id] = { archivo: v.archivo, autor: v.autor, licencia: v.licencia, fuente: v.fuente };
  }
  fs.writeFileSync(
    "lib/db/photos.ts",
    "// AUTO-GENERADO por scripts/build-images.mjs — no editar a mano.\n" +
      "// Mapa playerId -> Foto (autor/licencia/fuente para atribución).\n" +
      'import type { Foto } from "./types";\n' +
      "export const PHOTOS: Record<string, Foto> = " + JSON.stringify(photos) + ";\n",
  );
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const players = loadPlayers();
  const cache = loadCache();

  let done = 0, ok = 0, processed = 0;
  for (const p of players) {
    if (processed >= LIMIT) break;
    if (cache[p.id]) { if (cache[p.id].status === "ok") ok++; continue; }
    processed++;
    try {
      const best = await resolve(p);
      if (!best) {
        cache[p.id] = { status: "none" };
      } else {
        const c = await commons(best.p18);
        if (!c) {
          cache[p.id] = { status: "none" };
        } else {
          const ext = (path.extname(new URL(c.thumburl).pathname) || ".jpg").toLowerCase();
          const archivo = `/players/${p.id}${ext}`;
          await download(c.thumburl, `public/players/${p.id}${ext}`);
          cache[p.id] = {
            status: "ok", archivo, autor: c.autor, licencia: c.licencia,
            fuente: `https://www.wikidata.org/wiki/${best.id}`,
          };
          ok++;
        }
      }
    } catch (e) {
      console.warn(`  ${p.nombre}: ${e.message}`);
      cache[p.id] = { status: "error" };
    }
    done++;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    if (done % 10 === 0) { writeManifest(cache); console.log(`  …${done} procesados, ${ok} con foto`); }
    await sleep(DELAY);
  }

  writeManifest(cache);
  console.log(`\nListo. Con foto: ${ok}. Imágenes en ${OUT_DIR}/, manifiesto en lib/db/photos.ts`);
}

main();
