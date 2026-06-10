import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const ADSENSE_CLIENT = "ca-pub-4390753504297076";
const GTM_ID = "GTM-MQLW2PG3";

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
      <head>
        {/* Google AdSense (loader en <head> para la verificación) */}
        <Script
          id="adsbygoogle-init"
          async
          strategy="beforeInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        />
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      {/* suppressHydrationWarning: extensiones del navegador (p.ej. ColorZilla con
          cz-shortcut-listen) inyectan atributos en <body> antes de hidratar. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {children}
        <Footer />
      </body>
    </html>
  );
}
