import type { Metadata } from "next";
import Link from "next/link";
import { MemphisBackground } from "@/components/ui/MemphisBackground";

export const metadata: Metadata = {
  title: "Política de Privacidad — JuegaMundial",
  description: "Cómo JuegaMundial usa cookies, publicidad de Google y almacenamiento local.",
};

const ACTUALIZADO = "3 de junio de 2026";

export default function PrivacidadPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      <MemphisBackground />

      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm font-bold text-[var(--color-gray-light)]/80 hover:text-white">
          ← Inicio
        </Link>

        <h1 className="mt-4 text-3xl font-black uppercase italic sm:text-4xl">
          Política de <span className="text-[var(--color-green)]">Privacidad</span>
        </h1>
        <p className="mt-1 text-xs text-[var(--color-gray-light)]/60">Última actualización: {ACTUALIZADO}</p>

        <div className="mt-6 space-y-6 rounded-3xl bg-[var(--color-navy)] p-6 text-sm leading-relaxed text-[var(--color-gray-light)] ring-1 ring-white/10">
          <section>
            <h2 className="mb-1 text-lg font-black text-white">Quiénes somos</h2>
            <p>
              JuegaMundial (juegamundial.xyz) es un sitio de juegos y trivia sobre los Mundiales de
              fútbol. No requiere registro ni recopila datos personales directamente.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Publicidad (Google AdSense)</h2>
            <p>
              Usamos <b className="text-white">Google AdSense</b> para mostrar anuncios. Google y sus
              socios pueden usar <b className="text-white">cookies</b> e identificadores para mostrar
              anuncios basados en tus visitas a este y otros sitios. Puedes gestionar tus preferencias
              de anuncios personalizados en{" "}
              <a className="text-[var(--color-green)] underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                google.com/settings/ads
              </a>{" "}
              y consultar{" "}
              <a className="text-[var(--color-green)] underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
                cómo Google usa los datos
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Analítica</h2>
            <p>
              Usamos <b className="text-white">Google Tag Manager</b> y herramientas de analítica de
              Google para entender el uso del sitio de forma agregada y anónima.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Almacenamiento local</h2>
            <p>
              Algunos juegos guardan tu progreso y puntuaciones en el{" "}
              <b className="text-white">almacenamiento local</b> de tu navegador. Esa información no
              sale de tu dispositivo y puedes borrarla limpiando los datos del navegador.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Usuarios del EEE, Reino Unido y Suiza</h2>
            <p>
              Mostramos un aviso de consentimiento mediante una plataforma de gestión del consentimiento
              certificada por Google. Puedes <b className="text-white">consentir</b> o{" "}
              <b className="text-white">gestionar tus opciones</b> antes de que se usen cookies
              publicitarias, conforme al RGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Imágenes</h2>
            <p>
              Las fotos de jugadores provienen de Wikimedia Commons y se usan con su licencia y
              atribución correspondiente; las banderas y nombres son de dominio público o de uso libre.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-black text-white">Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad escribe a{" "}
              <a className="text-[var(--color-green)] underline" href="mailto:rlozada808@gmail.com">
                rlozada808@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-[var(--color-green)] px-5 py-2 font-extrabold text-[var(--color-navy-deep)]"
        >
          Volver a jugar
        </Link>
      </div>
    </main>
  );
}
