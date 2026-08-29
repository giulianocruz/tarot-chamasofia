import { open,stat } from 'node:fs/promises';

const site=(process.env.SITE_URL||'https://tarot.chamasofia.com.br').replace(/\/$/,'');
const secret=process.env.BOOK_UPLOAD_SECRET;
if(!secret)throw new Error('Defina BOOK_UPLOAD_SECRET.');
const books={
  'pomba-gira':process.argv[2],
  'preto-velho':process.argv[3],
  'tarot-para-iniciantes':process.argv[4],
};
if(Object.values(books).some(value=>!value))throw new Error('Uso: node scripts/upload-books.mjs pomba-gira.pdf preto-velho.pdf tarot.pdf');

async function request(url,options={}){
  const response=await fetch(url,{...options,headers:{'x-upload-token':secret,...options.headers}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`${response.status}: ${data.error||'falha no upload'}`);
  return data;
}

async function upload(slug,path){
  const size=(await stat(path)).size,chunkSize=10*1024*1024;
  const initiated=await request(`${site}/api/admin/ebook?book=${slug}&action=initiate`,{method:'PUT'});
  const file=await open(path,'r'),parts=[];
  try{
    for(let offset=0,partNumber=1;offset<size;offset+=chunkSize,partNumber++){
      const length=Math.min(chunkSize,size-offset),buffer=Buffer.allocUnsafe(length);
      const {bytesRead}=await file.read(buffer,0,length,offset);
      const part=await request(`${site}/api/admin/ebook?book=${slug}&action=part&uploadId=${encodeURIComponent(initiated.uploadId)}&partNumber=${partNumber}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream','Content-Length':String(bytesRead)},body:buffer.subarray(0,bytesRead)});
      parts.push({partNumber:part.partNumber,etag:part.etag});
      process.stdout.write(`${slug}: ${Math.min(offset+bytesRead,size)}/${size}\n`);
    }
    await request(`${site}/api/admin/ebook?book=${slug}&action=complete&uploadId=${encodeURIComponent(initiated.uploadId)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({parts})});
  }catch(error){
    await request(`${site}/api/admin/ebook?book=${slug}&action=abort&uploadId=${encodeURIComponent(initiated.uploadId)}`,{method:'PUT'}).catch(()=>undefined);
    throw error;
  }finally{await file.close();}
}

for(const [slug,path] of Object.entries(books))await upload(slug,path);
console.log('Todos os livros foram enviados.');
