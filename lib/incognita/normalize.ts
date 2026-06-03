// Normaliza texto para el juego: MAYÚSCULAS, sin acentos, conservando Ñ como letra.
// (La Ñ se trata aparte porque NFD la descompone en N + tilde y el stripping la perdería.)
// Mantener en sync con scripts/build-incognita.mjs.
export function normalize(s: string): string {
  if (!s) return "";
  let out = "";
  for (const ch of s.toUpperCase()) {
    if (ch === "Ñ") {
      // Ñ
      out += "Ñ";
      continue;
    }
    // NFD descompone los acentos; \p{M} elimina las marcas combinantes resultantes.
    out += ch.normalize("NFD").replace(/\p{M}/gu, "");
  }
  return out;
}
