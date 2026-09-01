import type { Metadata } from 'next';
import ConsultaClient from './consulta-client';
import { shouldUseConsulta, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sua leitura personalizada de Tarot | Chama Sofia',
  description: 'Escolha três cartas e receba uma leitura personalizada com PDF e e-book bônus.',
  alternates: { canonical: '/consulta' },
  robots: { index: false, follow: true },
};

export default async function ConsultaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <ConsultaClient paidTraffic={shouldUseConsulta(params)} />;
}
