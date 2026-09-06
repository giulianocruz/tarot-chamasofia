import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const consulta=readFileSync(new URL('../app/consulta/consulta-client.tsx',import.meta.url),'utf8');
const meta=readFileSync(new URL('../lib/meta.ts',import.meta.url),'utf8');
const reading=readFileSync(new URL('../app/leitura/[token]/reading-client.tsx',import.meta.url),'utf8');

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
