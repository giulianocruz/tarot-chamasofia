import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tarot.chamasofia.com.br'),
  title: 'Tarot Chama Sofia — Faça sua pergunta ao Tarot',
  description: 'Leitura automática de Tarot com 3 cartas, interpretação personalizada, PDF e e-book bônus.',
  alternates: { canonical: '/' },
  openGraph: { title:'Faça sua pergunta ao Tarot | Chama Sofia', description:'3 cartas, leitura personalizada, PDF e e-book Tarot para Iniciantes.', url:'/', siteName:'Chama Sofia', locale:'pt_BR', type:'website', images:[{url:'/og.png',width:1200,height:630,alt:'Faça sua pergunta ao Tarot - Chama Sofia'}] },
  twitter: { card:'summary_large_image', title:'Faça sua pergunta ao Tarot | Chama Sofia', description:'3 cartas, leitura personalizada, PDF e e-book.', images:['/og.png'] },
  robots: { index:true, follow:true },
  icons: { icon:'/icon' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
