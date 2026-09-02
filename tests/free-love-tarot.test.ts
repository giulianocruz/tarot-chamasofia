import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../app/tarot-do-amor-gratis/page.tsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/tarot-do-amor-gratis/love-tarot-client.tsx',import.meta.url),'utf8');
const sitemap=readFileSync(new URL('../app/sitemap.ts',import.meta.url),'utf8');
const hub=readFileSync(new URL('../app/artigos/page.tsx',import.meta.url),'utf8');

test('tarot do amor grátis é indexável e possui schema útil',()=>{
  assert.match(page,/Tarot do Amor Grátis/);
  assert.match(page,/canonical: '\/tarot-do-amor-gratis'/);
  assert.match(page,/WebApplication/);
  assert.match(page,/FAQPage/);
  assert.match(page,/sem cadastro/);
});

test('tiragem gratuita tem 3 cartas, analytics e CTA para AstroTarot',()=>{
  assert.match(client,/selected\.length!==3/);
  assert.match(client,/reading_preview/);
  assert.match(client,/utm_medium=free_tool/);
  assert.match(client,/tarot_amor_gratis/);
  assert.match(client,/Compartilhar ferramenta/);
});

test('ferramenta recebe links internos e entra no sitemap',()=>{
  assert.match(sitemap,/tarot-do-amor-gratis/);
  assert.match(hub,/Tarot do Amor Grátis/);
});
