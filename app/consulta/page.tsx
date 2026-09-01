import type { Metadata } from 'next';
import ConsultaClient from './consulta-client';
import { shouldUseConsulta, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Mapa Astral Express + Tarot | Chama Sofia',
  description: 'Cruze seu mapa natal e o céu atual com três cartas de Tarot e receba uma análise personalizada em PDF.',
  alternates: { canonical: '/consulta' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Mapa Astral Express + Tarot | Chama Sofia',
    description: 'Seu mapa natal, trânsitos atuais e três cartas reunidos em uma análise personalizada.',
    url: '/consulta',
  },
};

export default async function ConsultaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <ConsultaClient paidTraffic={shouldUseConsulta(params)} />;
}
