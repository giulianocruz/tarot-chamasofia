import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const meta = readFileSync(new URL('../lib/meta.ts', import.meta.url), 'utf8');
const payment = readFileSync(new URL('../lib/payment.ts', import.meta.url), 'utf8');

test('CAPI transforma fbclid salvo em fbc sem coletar IP', () => {
  assert.match(meta, /metaFbcFromFbclid/);
  assert.match(meta, /`fb\.1\.\$\{timestampMs\}\.\$\{clickId\}`/);
  assert.match(meta, /userData\.fbc = fbc/);
  assert.doesNotMatch(meta, /client_ip_address|x-forwarded-for|cf-connecting-ip/i);
});

test('pedidos de teste nunca geram Purchase no CAPI', () => {
  assert.match(meta, /if \(order\.is_test\) return \{ attempted:false, ok:false, reason:'test_order'/);
  assert.ok((payment.match(/is_test:analyticsContext\.is_test/g) || []).length >= 2);
});

test('pagamento repassa fbclid tanto na consulta quanto no e-book', () => {
  assert.ok((payment.match(/fbclid:order\.fbclid\?String\(order\.fbclid\):null/g) || []).length >= 2);
  assert.match(meta, /META_GRAPH_VERSION \|\| 'v26\.0'/);
  assert.match(meta, /event_id:`purchase-\$\{order\.order_number\}`/);
});
