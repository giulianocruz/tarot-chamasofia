import type { Metadata } from "next";
import LandingClient from "../landing-client";

export const metadata: Metadata = {
  title: "AstroTarot | Seu céu e suas cartas em uma leitura só",
  description:
    "Conheça a experiência AstroTarot Chama Sofia: Mapa Astral Express, trânsitos atuais e três cartas reunidos em uma análise personalizada.",
  alternates: { canonical: "/astrotarot" },
  openGraph: {
    title: "AstroTarot | Chama Sofia",
    description:
      "Seu céu de nascimento, o momento astral atual e três cartas em uma experiência personalizada.",
    url: "/astrotarot",
  },
};

export default function AstroTarotPage() {
  return <LandingClient />;
}
