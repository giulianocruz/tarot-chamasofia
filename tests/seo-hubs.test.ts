import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=(rel:string)=>fs.readFileSync(path.join(root,rel),'utf8');

test('AstroTarot expõe imagem social e oferta estruturada correta',()=>{
  const source=read('app/astrotarot/page.tsx');
  assert.match(source,/images: \[\{ url: "\/og\.png"/);
  assert.match(source,/'@type': 'Service'/);
  assert.match(source,/price: '9\.90'/);
  assert.match(source,/priceCurrency: 'BRL'/);
});

test('hub de artigos expõe imagem social e schemas de coleção',()=>{
  const source=read('app/artigos/page.tsx');
  assert.match(source,/images: \[\{ url: '\/og\.png'/);
  assert.match(source,/'@type':'CollectionPage'/);
  assert.match(source,/'@type':'ItemList'/);
  assert.match(source,/numberOfItems:ARTICLES\.length/);
});

test('Biblioteca deixa de ser página fina e descreve acervo em HTML',()=>{
  const page=read('app/biblioteca/page.tsx');
  const client=read('app/biblioteca/biblioteca-client.tsx');
  assert.match(page,/'@type':'CollectionPage'/);
  assert.match(page,/'@type':'Book'/);
  assert.match(page,/BOOK_CATALOG\.length/);
  assert.match(client,/E-books para aprofundar Tarot e tradições da Umbanda/);
  assert.match(client,/\/tarot-do-amor-gratis/);
  assert.match(client,/\/mapa-astral-gratis/);
});
