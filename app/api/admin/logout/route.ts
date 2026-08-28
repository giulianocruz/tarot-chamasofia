import { sameOrigin } from '@/lib/security';
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});return Response.json({ok:true},{headers:{'Set-Cookie':'cs_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0','Cache-Control':'no-store'}})}
