import LandingClient from './landing-client';
import { redirect } from 'next/navigation';
import { consultationUrl, shouldUseConsulta, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  if (shouldUseConsulta(params)) redirect(consultationUrl(params));
  return <LandingClient />;
}
