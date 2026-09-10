import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { consultationUrl, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const headerStore = await headers();
  const host = (headerStore.get('host') || '').split(':')[0].toLowerCase();
  if (host === 'jornada.chamasofia.com.br' || host.startsWith('jornada.')) {
    redirect('/mapa-astral');
  }
  const params = await searchParams;
  redirect(consultationUrl(params));
}
