import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tarot.chamasofia.com.br'),
  title: 'Leitura de Tarô Personalizada + E-book por R$ 9,90 | Chama Sofia',
  description: 'Faça uma leitura personalizada de 3 cartas, receba a interpretação em PDF e leve o e-book Tarot para Iniciantes. Pagamento único via Pix.',
  alternates: { canonical: '/' },
  openGraph: { title:'Leitura de Tarô Personalizada + E-book por R$ 9,90 | Chama Sofia', description:'Faça uma leitura personalizada de 3 cartas, receba a interpretação em PDF e leve o e-book Tarot para Iniciantes.', url:'/', siteName:'Chama Sofia', locale:'pt_BR', type:'website', images:[{url:'/og.png',width:1200,height:630,alt:'Tarot para Iniciantes e leitura personalizada - Chama Sofia'}] },
  twitter: { card:'summary_large_image', title:'Leitura de Tarô Personalizada + E-book por R$ 9,90', description:'Leitura personalizada de 3 cartas, PDF e livro digital em uma compra única via Pix.', images:['/og.png'] },
  robots: { index:true, follow:true },
  icons: { icon:'/assets/brand/chama-sofia-logo.png', apple:'/assets/brand/chama-sofia-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
