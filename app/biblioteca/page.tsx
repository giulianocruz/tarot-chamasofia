import type { Metadata } from "next";
import BibliotecaClient from "./biblioteca-client";

export const metadata: Metadata = {
  title: "Biblioteca Chama Sofia | E-books digitais",
  description: "E-books digitais sobre Tarot, Exu, Pomba Gira e Preto Velho com pagamento via Pix e acesso privado.",
  alternates: { canonical: "/biblioteca" },
  openGraph: {
    title: "Biblioteca Chama Sofia",
    description: "E-books digitais para continuar sua jornada de estudo e reflexão.",
    url: "/biblioteca",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Biblioteca Chama Sofia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biblioteca Chama Sofia | E-books digitais",
    description: "Tarot, Exu, Pomba Gira e Preto Velho em edições digitais com acesso privado.",
    images: ["/og.png"],
  },
};

export default function BibliotecaPage() {
  return <BibliotecaClient />;
}
