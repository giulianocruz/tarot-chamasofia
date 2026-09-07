import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tarot.chamasofia.com.br'),
  title: 'Mapa Astral Express + Tarot | Chama Sofia',
  description: 'Mapa natal, trânsitos atuais e Tarot reunidos em uma análise personalizada com PDF premium e e-book bônus.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Mapa Astral Express + Tarot | Chama Sofia',
    description: 'Cruze seu céu de nascimento, o momento astral atual e três cartas em uma leitura integrada.',
    url: '/', siteName: 'Chama Sofia', locale: 'pt_BR', type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Mapa Astral Express + Tarot - Chama Sofia' }],
  },
  twitter: { card: 'summary_large_image', title: 'Mapa Astral Express + Tarot', description: 'Seu mapa natal, céu atual e Tarot em uma análise personalizada.', images: ['/og.png'] },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
