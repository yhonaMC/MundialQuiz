// Banderas de país como IMAGEN (no emoji): los emoji de bandera (🇦🇷) NO se
// renderizan como bandera en Windows — salen como "AR". flagcdn.com sirve PNGs que
// se ven igual en todas las plataformas. Mapa país (es) → ISO 3166-1 alpha-2 para los
// países que pueden aparecer como criterio (≥14 jugadores en la BD).
const ISO2: Record<string, string> = {
  Alemania: "de",
  "Arabia Saudita": "sa",
  Argelia: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  "Bosnia y Herzegovina": "ba",
  Brasil: "br",
  Bélgica: "be",
  "Cabo Verde": "cv",
  Canadá: "ca",
  Catar: "qa",
  Chequia: "cz",
  Colombia: "co",
  "Corea del Sur": "kr",
  "Costa Rica": "cr",
  "Costa de Marfil": "ci",
  Croacia: "hr",
  Curazao: "cw",
  Ecuador: "ec",
  Egipto: "eg",
  Escocia: "gb-sct",
  España: "es",
  "Estados Unidos": "us",
  Francia: "fr",
  Ghana: "gh",
  Haití: "ht",
  Inglaterra: "gb-eng",
  Irak: "iq",
  Irán: "ir",
  Japón: "jp",
  Jordania: "jo",
  Marruecos: "ma",
  México: "mx",
  Noruega: "no",
  "Nueva Zelanda": "nz",
  Panamá: "pa",
  Paraguay: "py",
  "Países Bajos": "nl",
  Portugal: "pt",
  "RD del Congo": "cd",
  Senegal: "sn",
  Serbia: "rs",
  Sudáfrica: "za",
  Suecia: "se",
  Suiza: "ch",
  Turquía: "tr",
  Túnez: "tn",
  Uruguay: "uy",
  Uzbekistán: "uz",
};

// URL de la bandera (PNG de ~20px de alto), o null si no hay mapeo (degradación: solo texto).
export function banderaUrl(paisEs: string): string | null {
  const code = ISO2[paisEs];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}
