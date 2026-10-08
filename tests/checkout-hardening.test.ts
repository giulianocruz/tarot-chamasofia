import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const checkout = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8');
const pdf = readFileSync(new URL('../app/api/pdf/[token]/route.ts', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../app/api/webhooks/payment/route.ts', import.meta.url), 'utf8');

test('falha no Pix automático cancela o pedido, não entrega Pix estático de difícil conciliação', () => {
  assert.match(checkout, /catch\s*\{[\s\S]*?UPDATE orders SET payment_status='cancelled',pix_payload=NULL/);
  assert.match(checkout, /Não foi possível gerar o Pix automático/);
  assert.doesNotMatch(checkout, /if\s*\(!pixPayload\)/);
});

test('PDF somente sai após confirmação explícita do pagamento', () => {
  assert.match(pdf, /order\.payment_status !== 'paid'/);
  assert.match(pdf, /!order\.reading_json \|\| !order\.cards_json/);
});

test('webhook exige assinatura e confere valor antes de liberar uma leitura', () => {
  assert.match(webhook, /verifyMercadoPagoSignature\(request, paymentId\)/);
  assert.match(webhook, /payment\.status !== "approved"/);
  assert.match(webhook, /Number\(order\.price\)/);
  assert.match(webhook, /completePayment\(/);
});

test('checkout exige Mercado Pago e webhook assinado, sem Pix estático alternativo', () => {
  assert.match(checkout, /!env\.MERCADO_PAGO_ACCESS_TOKEN \|\| !env\.MERCADO_PAGO_WEBHOOK_SECRET/);
  assert.doesNotMatch(checkout, /createPixPayload/);
  assert.match(checkout, /Nenhum Pix foi gerado/);
});

test('health só declara checkout pronto com token e webhook configurados', () => {
  const health = readFileSync(new URL('../app/api/health/route.ts', import.meta.url), 'utf8');
  assert.match(health, /paymentConfigured: Boolean\(env\.MERCADO_PAGO_ACCESS_TOKEN && env\.MERCADO_PAGO_WEBHOOK_SECRET\)/);
  assert.doesNotMatch(health, /paymentConfigured:[^\n]*env\.PIX_KEY/);
});
