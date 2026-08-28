import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tarot.chamasofia.com.br'),
  title: 'Tarot para Iniciantes + Leitura Personalizada | Chama Sofia',
  description: 'Aprenda Tarot com o livro Tarot para Iniciantes e receba uma leitura personalizada de 3 cartas como bônus. Acesso imediato e pagamento via Pix.',
  alternates: { canonical: '/' },
  openGraph: { title:'Tarot para Iniciantes + Leitura Personalizada | Chama Sofia', description:'Livro digital de 276 páginas com leitura personalizada de 3 cartas e PDF como bônus.', url:'/', siteName:'Chama Sofia', locale:'pt_BR', type:'website', images:[{url:'/og.png',width:1200,height:630,alt:'Tarot para Iniciantes e leitura personalizada - Chama Sofia'}] },
  twitter: { card:'summary_large_image', title:'Tarot para Iniciantes + Leitura Personalizada', description:'Livro digital de 276 páginas com leitura de 3 cartas como bônus.', images:['/og.png'] },
  robots: { index:true, follow:true },
  icons: { icon:'/assets/brand/chama-sofia-logo.png', apple:'/assets/brand/chama-sofia-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
