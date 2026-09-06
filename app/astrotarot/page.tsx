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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AstroTarot Chama Sofia — mapa astral e três cartas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroTarot | Seu céu e suas cartas",
    description: "Mapa natal, céu do momento e três cartas em uma leitura personalizada.",
    images: ["/og.png"],
  },
};

export default function AstroTarotPage() {
  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'AstroTarot Chama Sofia', serviceType: 'Leitura digital personalizada de mapa astral e Tarot',
    url: 'https://tarot.chamasofia.com.br/astrotarot',
    image: 'https://tarot.chamasofia.com.br/og.png',
    description: 'Mapa natal, trânsitos atuais e três cartas reunidos em uma análise personalizada.',
    provider: { '@type': 'Organization', name: 'Chama Sofia', url: 'https://chamasofia.com.br' },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    offers: { '@type': 'Offer', price: '9.90', priceCurrency: 'BRL', availability: 'https://schema.org/InStock', url: 'https://tarot.chamasofia.com.br/consulta' },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(serviceSchema)}}/><LandingClient /></>;
}
