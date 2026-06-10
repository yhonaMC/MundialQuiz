// Genera una imagen (canvas) del resultado de la Rejilla y la comparte (Web Share con
// archivo) o la descarga. Solo cliente. Devuelve cómo terminó para mostrar feedback.
export type EstadoCeldaImg = "ok" | "fail" | "empty";

interface OpcionesImagen {
  titulo: string; // "Rejilla Mundialera"
  sub: string; // fecha o "Práctica (Difícil)"
  resultado: string; // "7/9 · 420 pts"
  celdas: EstadoCeldaImg[]; // 9
}

const COLORES: Record<EstadoCeldaImg, string> = {
  ok: "#3cac3b",
  fail: "#e61d25",
  empty: "rgba(255,255,255,0.14)",
};

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

export async function compartirImagen(opts: OpcionesImagen): Promise<"shared" | "downloaded" | "error"> {
  try {
    const W = 600;
    const H = 760;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "error";

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2a398d");
    grad.addColorStop(1, "#18225c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Título + subtítulo
    ctx.textAlign = "center";
    ctx.fillStyle = "#25c4d6";
    ctx.font = "900 40px Poppins, system-ui, sans-serif";
    ctx.fillText(opts.titulo.toUpperCase(), W / 2, 86);
    ctx.fillStyle = "rgba(209,212,209,0.8)";
    ctx.font = "700 22px Poppins, system-ui, sans-serif";
    ctx.fillText(opts.sub, W / 2, 124);

    // Grilla 3×3
    const cell = 150;
    const gap = 12;
    const gridW = 3 * cell + 2 * gap;
    const startX = (W - gridW) / 2;
    const startY = 170;
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      ctx.fillStyle = COLORES[opts.celdas[i] ?? "empty"];
      rect(ctx, startX + col * (cell + gap), startY + row * (cell + gap), cell, cell, 20);
    }

    // Resultado
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 44px Poppins, system-ui, sans-serif";
    ctx.fillText(opts.resultado, W / 2, startY + 3 * cell + 2 * gap + 64);

    // Pie
    ctx.fillStyle = "rgba(209,212,209,0.55)";
    ctx.font = "700 20px Poppins, system-ui, sans-serif";
    ctx.fillText("JuegaMundial", W / 2, H - 30);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return "error";
    const file = new File([blob], "rejilla.png", { type: "image/png" });

    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: `${opts.titulo} · ${opts.resultado}` });
      return "shared";
    }

    // Sin Web Share de archivos: descarga.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rejilla-mundialera.png";
    a.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return "error";
  }
}
