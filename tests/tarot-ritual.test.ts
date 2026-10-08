import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { CATEGORIES, TAROT_DECK, getCards } from '../lib/tarot.ts';
import { TAROT_SPREADS } from '../lib/spreads.ts';
import { createReadingEn } from '../lib/reading-en.ts';

test('baralho principal possui 78 cartas únicas', () => {
  assert.equal(TAROT_DECK.length, 78);
  assert.equal(new Set(TAROT_DECK.map((card) => card.id)).size, 78);
  assert.equal(TAROT_DECK.filter((card) => card.arcana === 'major').length, 22);
  assert.equal(TAROT_DECK.filter((card) => card.arcana === 'minor').length, 56);
});

test('métodos disponíveis usam as quantidades esperadas', () => {
  assert.deepEqual(TAROT_SPREADS.map((spread) => spread.count), [1,3,3,5,5,7,10,12]);
  for (const spread of TAROT_SPREADS) assert.equal(spread.positions.length, spread.count);
});

test('todos os temas exibidos no ritual são aceitos pelo backend', () => {
  assert.deepEqual(CATEGORIES, [
    'Amor e relacionamentos','Trabalho e carreira','Dinheiro','Caminhos',
    'Decisões','Vida pessoal','Energia do momento','Pergunta livre',
  ]);
});

test('consulta pública não limita mais o baralho a sete cartas', () => {
  const source=readFileSync(new URL('../app/consulta/consulta-client.tsx', import.meta.url),'utf8');
  assert.doesNotMatch(source, /MAJOR_ARCANA\.slice\(0,\s*7\)/);
  assert.match(source, /78 CARTAS DISPONÍVEIS/);
  assert.match(source, /TAROT_SPREADS\.map/);
  assert.match(source, /Math\.min\(cards\.length, 12\)/);
});

test('leitura em inglês aceita arcanos menores sem conteúdo indefinido', () => {
  const cards=getCards(['cups-ace','swords-queen','pentacles-ten']);
  assert.equal(cards.length,3);
  const reading=createReadingEn('What should I understand about this decision now?','Decisões',cards);
  assert.equal(reading.cardReadings.length,3);
  assert.match(reading.cardReadings[0].cardName,/Ace of Cups/);
  assert.doesNotMatch(JSON.stringify(reading),/undefined/);
});


test('Mandala de 12 gera leitura e PDF completos sem rótulos indefinidos', async () => {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
  });
  try {
    const { createReading } = await vite.ssrLoadModule('/lib/reading.ts') as typeof import('../lib/reading.ts');
    const { createReadingPdf } = await vite.ssrLoadModule('/lib/pdf.ts') as typeof import('../lib/pdf.ts');
    const spread=TAROT_SPREADS.find((item)=>item.id==='mandala-12')!;
    const cards=TAROT_DECK.slice(0,spread.count);
    const reading=createReading('O que preciso compreender sobre meu ciclo atual?','Vida pessoal',cards,spread.id);
    assert.equal(reading.cardReadings.length,12);
    assert.equal(reading.cardReadings[0].position,'Essência');
    assert.equal(reading.cardReadings[11].position,'Mundo interior');
    assert.doesNotMatch(JSON.stringify(reading),/undefined/);
    const pdf=await createReadingPdf({
      order_number:'TESTE12',
      customer_name:'Teste',
      category:'Vida pessoal',
      question:'O que preciso compreender sobre meu ciclo atual?',
      created_at:'2026-10-07T12:00:00.000Z',
    },cards,reading);
    assert.ok(pdf.length>10000);
    assert.equal(new TextDecoder().decode(pdf.slice(0,4)),'%PDF');
  } finally {
    await vite.close();
  }
});


test('produto principal não regride para a antiga proposta AstroTarot de três cartas', () => {
  const consulta=readFileSync(new URL('../app/consulta/page.tsx', import.meta.url),'utf8');
  const layout=readFileSync(new URL('../app/layout.tsx', import.meta.url),'utf8');
  const manifest=readFileSync(new URL('../app/manifest.ts', import.meta.url),'utf8');
  const pdfRoute=readFileSync(new URL('../app/api/pdf/[token]/route.ts', import.meta.url),'utf8');
  const readingClient=readFileSync(new URL('../app/leitura/[token]/reading-client.tsx', import.meta.url),'utf8');

  assert.match(consulta,/78 cartas/);
  assert.match(consulta,/8 métodos/);
  assert.doesNotMatch(consulta,/Mapa Astral Express|três cartas/i);
  assert.match(layout,/Tarot Chama Sofia/);
  assert.doesNotMatch(layout,/Mapa Astral Express \+ Tarot/);
  assert.match(manifest,/Chama Sofia Tarot/);
  assert.match(pdfRoute,/leitura-tarot-chama-sofia/);
  assert.match(readingClient,/shareTitle.*astro-tarot/s);
});


test('AstroTarot preserva oferta própria e usa o ritual premium de 78 cartas', () => {
  const astroPage=readFileSync(new URL('../app/astrotarot/page.tsx', import.meta.url),'utf8');
  const landing=readFileSync(new URL('../app/landing-client.tsx', import.meta.url),'utf8');
  const consultaPage=readFileSync(new URL('../app/consulta/page.tsx', import.meta.url),'utf8');
  const consultaClient=readFileSync(new URL('../app/consulta/consulta-client.tsx', import.meta.url),'utf8');

  assert.match(astroPage,/78 do Tarot|Tarot completo/);
  assert.match(astroPage,/offer=astro-tarot/);
  assert.doesNotMatch(astroPage,/três cartas reunidos/i);
  assert.match(landing,/query\.set\("offer", "astro-tarot"\)/);
  assert.match(landing,/pricing\?offer=astro-tarot/);
  assert.doesNotMatch(landing,/legacy-question-section/);
  assert.match(landing,/78 cartas/);
  assert.match(consultaPage,/offerMode/);
  assert.match(consultaClient,/offer: offerMode/);
  assert.match(consultaClient,/isAstroTarot/);
});
