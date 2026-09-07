import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';

const consulta=readFileSync(new URL('../app/consulta/consulta-client.tsx',import.meta.url),'utf8');
const meta=readFileSync(new URL('../lib/meta.ts',import.meta.url),'utf8');
const reading=readFileSync(new URL('../app/leitura/[token]/reading-client.tsx',import.meta.url),'utf8');
const globals=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');

test('consulta carrega Meta Pixel e sinaliza topo do funil',()=>{
  assert.match(consulta,/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(consulta,/trackMeta\("PageView"\)/);
  assert.match(consulta,/trackMeta\("ViewContent"/);
  assert.match(consulta,/trackMeta\("InitiateCheckout"/);
  assert.match(consulta,/readAnalyticsContext\(\)\.is_test/);
  assert.doesNotMatch(consulta,/trackMeta\([^\n]*(email|whatsapp)/i);
});

test('CAPI usa Graph atual e Purchase permanece deduplicado',()=>{
  assert.match(meta,/META_GRAPH_VERSION \|\| 'v26\.0'/);
  assert.match(meta,/event_id:`purchase-\$\{order\.order_number\}`/);
  assert.match(reading,/eventID: `purchase-\$\{order\.orderNumber\}`/);
});

test('CAPI preserva atribuicao da Meta e ignora pedidos de teste',()=>{
  assert.match(meta,/normalizeTestFlag\(order\.is_test\)/);
  assert.match(meta,/userData\.fbc = fbc/);
  assert.match(meta,/userData\.external_id/);
  assert.match(meta,/sourcePath = isEnglish \? '\/en\/consult' : '\/consulta'/);
  const payment=readFileSync(new URL('../lib/payment.ts',import.meta.url),'utf8');
  assert.match(payment,/metaAttribution\(order\)/);
  assert.match(payment,/fbclid:order\.fbclid/);
});


test('copy do primeiro passo deixa a acao explicita',()=>{
  assert.match(consulta,/Escolha o tema da sua pergunta/);
  assert.match(consulta,/Toque em uma opção para continuar/);
});


test('tracking nativo convive com proxy temporario sem duplicar eventos',()=>{
  assert.match(consulta,/__csMetaProxyPage/);
  assert.match(consulta,/__csMetaProxyCheckout/);
  assert.match(consulta,/__csMetaProxyLead/);
  assert.match(consulta,/trackMeta\("Lead"/);
  assert.match(globals,/ESCOLHA UM TEMA - 1 TOQUE PARA CONTINUAR/);
});

test('eventos do funil carregam ordem causal do cliente',()=>{
  assert.match(consulta,/let clientEventSequence = 0/);
  assert.match(consulta,/client_event_seq: \+\+clientEventSequence/);
  assert.match(consulta,/client_event_ts: new Date\(\)\.toISOString\(\)/);
});

test('entrada paga usa cards de acao em coluna unica',()=>{
  assert.match(globals,/ESCOLHA UM TEMA - 1 TOQUE PARA CONTINUAR/);
  assert.match(globals,/\.consult-shell\.is-paid-entry \.consult-options\{grid-template-columns:1fr/);
  assert.match(globals,/grid-template-columns:38px 1fr 24px/);
});


test('entrada paga remove decoração pesada antes da primeira ação',()=>{
  assert.match(consulta,/\{!paidTraffic && <div className="consult-mini-deck"/);
  assert.match(globals,/consult-shell\.is-paid-entry\{background-image:none\}/);
  assert.match(consulta,/verso-premium\.jpg.*width="49" height="74"/s);
});

test('entrada paga troca logo raster pesado por marca leve',()=>{
  assert.match(consulta,/paidTraffic \? <span className="consult-brand-glyph"/);
  assert.match(globals,/\.consult-brand-glyph\{/);
});

test('favicon usa ativos leves dedicados',()=>{
  const layout=readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
  assert.match(layout,/icon: '\/favicon\.svg'/);
  assert.match(layout,/apple: '\/apple-touch-icon\.png'/);
  assert.ok(statSync(new URL('../public/apple-touch-icon.png',import.meta.url)).size < 10000);
});