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
