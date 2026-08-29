import { env } from 'cloudflare:workers';
import { ensureSchema, getCurrentPrice, getD1 } from './database';
import { formatBRL } from './pricing';

export const LIBRARY_BOOKS=[
  {slug:'tarot-para-iniciantes',title:'Tarot para Iniciantes',objectKey:'tarot-para-iniciantes.pdf',cover:'/assets/books/tarot-para-iniciantes-oficial.jpg'},
  {slug:'pomba-gira',title:'Pomba Gira: O Grande Livro das Falanges Femininas da Umbanda',objectKey:'pomba-gira.pdf',cover:'/assets/books/pomba-gira.jpg'},
  {slug:'preto-velho',title:'Preto Velho e suas Falanges',objectKey:'preto-velho.pdf',cover:'/assets/books/preto-velho.jpg'},
] as const;

export async function getCommercialOffers() {
  await ensureSchema();
  const [price,settings,availability]=await Promise.all([
    getCurrentPrice(),
    getD1().prepare("SELECT key,value_cents FROM operation_settings WHERE key IN ('complete_offer_cents','library_upsell_cents')").all<{key:string;value_cents:number}>(),
    Promise.all(LIBRARY_BOOKS.map(async(book)=>({slug:book.slug,available:Boolean(await env.BOOKS.head(book.objectKey))}))),
  ]);
  const values=Object.fromEntries(settings.results.map(item=>[item.key,Number(item.value_cents)]));
  const completeAvailable=availability.every(item=>item.available);
  const completeCents=Math.max(price.cents,Number(values.complete_offer_cents||1990));
  const upsellCents=Math.max(0,Number(values.library_upsell_cents||990));
  return {
    essential:{code:'essential',name:'Leitura Essencial',cents:price.cents,formatted:price.formatted,available:true,books:['tarot-para-iniciantes']},
    complete:{code:'complete',name:'Pacote Completo',cents:completeCents,formatted:formatBRL(completeCents),available:completeAvailable,books:LIBRARY_BOOKS.map(book=>book.slug)},
    upsell:{code:'library',name:'Complete sua biblioteca',cents:upsellCents,formatted:formatBRL(upsellCents),available:completeAvailable,books:['pomba-gira','preto-velho']},
    books:LIBRARY_BOOKS.map(book=>({...book,available:availability.find(item=>item.slug===book.slug)?.available||false})),
    pricing:price,
  };
}
