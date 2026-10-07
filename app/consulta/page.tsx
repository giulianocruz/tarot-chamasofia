import type { Metadata } from 'next';
import ConsultaClient from './consulta-client';
import { shouldUseConsulta, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tarot Chama Sofia | Escolha sua tiragem e suas cartas',
  description: 'Faça sua pergunta, escolha entre 8 métodos de tiragem e selecione intuitivamente entre as 78 cartas do Tarot. Receba uma leitura personalizada em PDF.',
  alternates: { canonical: '/consulta' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Tarot Chama Sofia | Sua consulta, suas cartas, seu método',
    description: 'Escolha o tema, o método e suas cartas entre as 78 do baralho. Uma experiência de Tarot premium, pessoal e feita para a sua pergunta.',
    url: '/consulta',
  },
};

export default async function ConsultaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <ConsultaClient paidTraffic={shouldUseConsulta(params)} />;
}
