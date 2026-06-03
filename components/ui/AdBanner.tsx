"use client";
import { useEffect } from "react";

const CLIENT = "ca-pub-4390753504297076";
// Slot de la unidad de anuncio (créala en AdSense → Display). Se configura por env
// (NEXT_PUBLIC_ADSENSE_SLOT). Si no está, el banner no se muestra → cero molestias.
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "";

export function AdBanner({ className = "" }: { className?: string }) {
  useEffect(() => {
    if (!SLOT) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // adblock o script no cargado: se ignora.
    }
  }, []);

  if (!SLOT) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={CLIENT}
      data-ad-slot={SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
