import { getCommercialOffers } from '@/lib/offers';
export const dynamic='force-dynamic';
export async function GET(){
  const offers=await getCommercialOffers();
  return Response.json(offers,{headers:{'Cache-Control':'no-store'}});
}
