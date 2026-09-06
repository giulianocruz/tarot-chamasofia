import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../app/mapa-astral-gratis/page.tsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/mapa-astral-gratis/free-birth-chart-client.tsx',import.meta.url),'utf8');
const route=readFileSync(new URL('../app/api/astrology/free-preview/route.ts',import.meta.url),'utf8');
const sitemap=readFileSync(new URL('../app/sitemap.ts',import.meta.url),'utf8');

test('mapa astral grátis tem SEO, schema e conteúdo útil',()=>{
  assert.match(page,/Mapa Astral Grátis Online/);
  assert.match(page,/WebApplication/);
  assert.match(page,/FAQPage/);
  assert.match(page,/mapa-astral-sem-horario-de-nascimento/);
});

test('ferramenta gratuita preserva conversão e proteção da API',()=>{
  assert.match(client,/utm_medium=free_tool/);
  assert.match(client,/CRUZAR MAPA \+ 3 CARTAS/);
  assert.match(route,/checkRateLimit/);
  assert.match(route,/SHA-256/);
  assert.match(route,/createFreeNatalPreview/);
});

test('sitemap inclui a ferramenta orgânica',()=>assert.match(sitemap,/mapa-astral-gratis/));

const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
test('home redireciona todo tráfego para a consulta preservando atribuição',()=>{assert.match(home,/redirect\(consultationUrl\(params\)\)/);assert.doesNotMatch(home,/LandingClient/);});
