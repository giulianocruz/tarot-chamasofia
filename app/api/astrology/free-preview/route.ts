import { createFreeNatalPreview, validateBirthInput } from '@/lib/astrology';
import type { BirthInput } from '@/lib/astrology-types';
import { addEvent, checkRateLimit } from '@/lib/database';
import { cleanText, sameOrigin } from '@/lib/security';

async function requestKey(request: Request) {
  const raw=request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const bytes=new TextEncoder().encode(raw.trim());
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return `free-astro:${Array.from(new Uint8Array(digest)).slice(0,12).map((b)=>b.toString(16).padStart(2,'0')).join('')}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:'Origem inválida.' },{ status:403 });
  const allowed=await checkRateLimit(await requestKey(request),4,60*60*1000);
  if (!allowed) return Response.json({ error:'Você já fez algumas consultas gratuitas recentemente. Tente novamente mais tarde.' },{ status:429 });
  const body=await request.json().catch(()=>({}));
  const input:BirthInput={
    birthDate:cleanText(body.birthDate,10),
    birthTime:cleanText(body.birthTime,5),
    birthPlace:cleanText(body.birthPlace,140),
    timeKnown:Boolean(body.timeKnown),
  };
  try { validateBirthInput(input); }
  catch (error) {
    return Response.json({ error:error instanceof Error?error.message:'Dados de nascimento inválidos.' },{ status:400 });
  }
  try {
    const preview=await createFreeNatalPreview(input);
    await addEvent('free_birth_chart_generated',null,null,{
      surface:'mapa-astral-gratis', time_known:input.timeKnown, resolved_place:preview.birth.resolvedPlace,
    });
    return Response.json({ ok:true, preview },{ headers:{ 'Cache-Control':'no-store' } });
  } catch (error) {
    console.error('free natal preview failed',error);
    return Response.json({ error:error instanceof Error?error.message:'Não foi possível calcular seu mapa agora.' },{ status:502 });
  }
}
