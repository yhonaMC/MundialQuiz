import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const ADSENSE_CLIENT = "ca-pub-1571636367391591";

export const metadata: Metadata = {
  title: "JuegaMundial — Juegos de los Mundiales",
  description:
    "JuegaMundial: juegos de los Mundiales 1930–2026 — quiz de trivia, La Incógnita Mundialera, La Conexión y ¿Quién es?",
  // Verificación de Google AdSense (meta google-adsense-account).
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Google AdSense */}
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        />
      </body>
    </html>
  );
}
