import type { Metadata } from 'next';
import ConsultaClient from './consulta-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sua leitura personalizada de Tarot | Chama Sofia',
  description: 'Escolha três cartas e receba uma leitura personalizada com PDF e e-book bônus.',
  alternates: { canonical: '/consulta' },
  robots: { index: false, follow: true },
};
export default function ConsultaPage(){ return <ConsultaClient />; }
