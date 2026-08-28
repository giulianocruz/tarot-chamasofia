import type { Metadata } from 'next';
import ThankYouClient from './thank-you-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title:'Compra confirmada | Chama Sofia',
  description:'Baixe seu livro e comece sua leitura personalizada.',
  robots:{index:false,follow:false},openGraph:{images:[]},twitter:{images:[]},
};

export default async function ThankYouPage({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  return <ThankYouClient token={token}/>;
}
