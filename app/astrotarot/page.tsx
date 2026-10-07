import type { Metadata } from "next";
import LandingClient from "../landing-client";

export const metadata: Metadata = {
  title: "AstroTarot | Mapa Astral + Tarot completo | Chama Sofia",
  description:
    "Escolha sua pergunta, o método e suas cartas entre as 78 do Tarot. Depois, cruze a tiragem com seu mapa natal e os principais trânsitos em uma análise personalizada.",
  alternates: { canonical: "/astrotarot" },
  openGraph: {
    title: "AstroTarot | Chama Sofia",
    description:
      "Tarot completo, mapa natal e céu do momento reunidos em uma experiência personalizada.",
    url: "/astrotarot",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AstroTarot Chama Sofia — mapa astral e Tarot completo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroTarot | Seu céu + seu Tarot",
    description: "Escolha seu método e suas cartas; depois cruze a leitura com mapa natal e céu do momento.",
    images: ["/og.png"],
  },
};

export default function AstroTarotPage() {
  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'AstroTarot Chama Sofia', serviceType: 'Leitura digital personalizada de mapa astral e Tarot',
    url: 'https://tarot.chamasofia.com.br/astrotarot',
    image: 'https://tarot.chamasofia.com.br/og.png',
    description: 'Tarot completo com método à escolha, mapa natal e principais trânsitos reunidos em uma análise personalizada.',
    provider: { '@type': 'Organization', name: 'Chama Sofia', url: 'https://chamasofia.com.br' },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    offers: {
      '@type': 'Offer',
      price: '9.90',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: 'https://tarot.chamasofia.com.br/consulta?offer=astro-tarot',
    },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(serviceSchema)}}/><LandingClient /></>;
}
