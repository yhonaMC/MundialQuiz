// Efectos de sonido sutiles de UI, generados con Web Audio (sin archivos).
// Volumen bajo. Todo va dentro de try/catch para que el audio NUNCA rompa la UI.

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur = 0.08, type: OscillatorType = "sine", vol = 0.04): void {
  const c = audioCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // audio no disponible: se ignora.
  }
}

export const sfx = {
  tap: () => blip(200, 0.05, "sine", 0.022),
  key: () => blip(330, 0.04, "triangle", 0.02),
  correct: () => {
    blip(660, 0.09, "sine", 0.05);
    window.setTimeout(() => blip(990, 0.12, "sine", 0.05), 80);
  },
  wrong: () => blip(150, 0.22, "sawtooth", 0.045),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => blip(f, 0.14, "sine", 0.05), i * 110));
  },
  lose: () => {
    blip(300, 0.18, "sine", 0.04);
    window.setTimeout(() => blip(180, 0.28, "sine", 0.04), 150);
  },
  // Alguien entra a la sala: dos notas ascendentes tipo "ping" alegre.
  join: () => {
    blip(740, 0.08, "triangle", 0.045);
    window.setTimeout(() => blip(1108, 0.12, "triangle", 0.045), 90);
  },
  // Notificación de evento (toast): blip corto y discreto.
  notify: () => blip(620, 0.07, "sine", 0.035),
  // Silbato de inicio de partida: barrido corto.
  whistle: () => {
    blip(1320, 0.1, "square", 0.03);
    window.setTimeout(() => blip(1760, 0.16, "square", 0.03), 90);
  },
};
