import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tarot.chamasofia.com.br'),
  title: 'Tarot Chama Sofia | Consulta de Tarot com 78 cartas',
  description: 'Faça sua pergunta, escolha seu método e selecione suas cartas entre as 78 do Tarot. Leituras personalizadas, ferramentas gratuitas e AstroTarot opcional.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Tarot Chama Sofia | Sua pergunta, seu método, suas cartas',
    description: 'Uma experiência de Tarot completa: 78 cartas, diferentes métodos de tiragem, leitura personalizada e PDF.',
    url: '/', siteName: 'Chama Sofia', locale: 'pt_BR', type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tarot Chama Sofia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarot Chama Sofia',
    description: 'Escolha sua tiragem e suas cartas em uma experiência de Tarot completa.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/assets/brand/chama-sofia-logo.png', apple: '/assets/brand/chama-sofia-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
