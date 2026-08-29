import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin';

export async function PUT(request: Request) {
  const uploadToken = request.headers.get('x-upload-token');
  const tokenAuthorized = Boolean(env.EBOOK_UPLOAD_SECRET && uploadToken === env.EBOOK_UPLOAD_SECRET);
  if (!tokenAuthorized && !(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const url=new URL(request.url),slug=url.searchParams.get('book')||'tarot-para-iniciantes',action=url.searchParams.get('action')||'single';
  if(!['tarot-para-iniciantes','pomba-gira','preto-velho'].includes(slug))return Response.json({error:'Livro inválido.'},{status:400});
  if(action==='initiate'){
    const upload=await env.BOOKS.createMultipartUpload(`${slug}.pdf`,{httpMetadata:{contentType:'application/pdf',contentDisposition:`attachment; filename="${slug}.pdf"`},customMetadata:{brand:'SofIA Labs'}});
    return Response.json({ok:true,key:upload.key,uploadId:upload.uploadId});
  }
  const uploadId=url.searchParams.get('uploadId')||'';
  if(action==='abort'){
    if(!uploadId)return Response.json({error:'Upload ausente.'},{status:400});
    await env.BOOKS.resumeMultipartUpload(`${slug}.pdf`,uploadId).abort();
    return Response.json({ok:true});
  }
  if(action==='complete'){
    if(!uploadId)return Response.json({error:'Upload ausente.'},{status:400});
    const body=await request.json().catch(()=>({})) as {parts?:Array<{partNumber:number;etag:string}>};
    if(!body.parts?.length)return Response.json({error:'Partes ausentes.'},{status:400});
    const object=await env.BOOKS.resumeMultipartUpload(`${slug}.pdf`,uploadId).complete(body.parts);
    return Response.json({ok:true,key:object.key});
  }
  if(!request.body)return Response.json({error:'Arquivo ausente.'},{status:400});
  const contentLength=Number(request.headers.get('content-length')||0);
  if(action==='part'){
    const partNumber=Number(url.searchParams.get('partNumber'));
    if(!uploadId||!Number.isInteger(partNumber)||partNumber<1||partNumber>10000)return Response.json({error:'Parte inválida.'},{status:400});
    if(contentLength>20*1024*1024)return Response.json({error:'Parte excede 20 MB.'},{status:413});
    const part=await env.BOOKS.resumeMultipartUpload(`${slug}.pdf`,uploadId).uploadPart(partNumber,request.body);
    return Response.json({ok:true,partNumber:part.partNumber,etag:part.etag});
  }
  if(request.headers.get('content-type')!=='application/pdf')return Response.json({error:'Envie um arquivo PDF.'},{status:415});
  if(contentLength&&contentLength>25*1024*1024)return Response.json({error:'Use o envio em partes para arquivos acima de 25 MB.'},{status:413});
  await env.BOOKS.put(`${slug}.pdf`, request.body, { httpMetadata: { contentType: 'application/pdf', contentDisposition: `attachment; filename="${slug}.pdf"` }, customMetadata: { brand: 'SofIA Labs' } });
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const books=await Promise.all(['tarot-para-iniciantes','pomba-gira','preto-velho'].map(async slug=>{const object=await env.BOOKS.head(`${slug}.pdf`);return {slug,uploaded:Boolean(object),size:object?.size??0};}));
  return Response.json({ books });
}
