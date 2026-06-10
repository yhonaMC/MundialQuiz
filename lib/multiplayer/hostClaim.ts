// Reclamo local de anfitrión por sala. Vive en sessionStorage del navegador del
// creador (o de un promovido): NO viaja en la URL, así compartir el link de la sala
// no regala el rol de anfitrión. Por pestaña y se pierde al cerrarla — si el
// anfitrión desaparece, el traspaso por presencia elige a otro.
const key = (codigo: string) => `juegamundial:host:${codigo.toUpperCase()}`;

export function claimHost(codigo: string): void {
  try {
    window.sessionStorage.setItem(key(codigo), "1");
  } catch {
    /* ignore */
  }
}

export function releaseHost(codigo: string): void {
  try {
    window.sessionStorage.removeItem(key(codigo));
  } catch {
    /* ignore */
  }
}

export function isClaimedHost(codigo: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key(codigo)) === "1";
  } catch {
    return false;
  }
}
