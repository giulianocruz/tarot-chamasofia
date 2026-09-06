import { redirect } from 'next/navigation';
import { consultationUrl, type SearchParams } from '@/lib/paid-traffic';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  redirect(consultationUrl(params));
}
