import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function source(path: string) { return readFile(new URL(path, root), 'utf8'); }

test('international checkout is USD 1.99 and fully readiness-gated', async () => {
  const checkout = await source('app/api/international/checkout/route.ts');
  const readiness = await source('lib/international-readiness.ts');
  assert.match(checkout, /priceCents = 199/);
  assert.match(checkout, /internationalReadiness\(\)\.ready/);
  for (const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','BREVO_API_KEY','EMAIL_FROM','ASTROLOGY_API_KEY']) assert.match(readiness, new RegExp(key));
});

test('international purchase requires legal consent and records its version', async () => {
  const checkout = await source('app/api/international/checkout/route.ts');
  const ui = await source('app/en/consult/consult-en-client.tsx');
  assert.match(checkout, /acceptedTerms === true/);
  assert.match(checkout, /privacy_consent_at/);
  assert.match(checkout, /2026-09-05-en-v1/);
  assert.match(ui, /\/en\/terms/);
  assert.match(ui, /\/en\/privacy/);
  assert.match(ui, /\/en\/refunds/);
});

test('Stripe webhook validates signatures before completing payment', async () => {
  const webhook = await source('app/api/webhooks/stripe/route.ts');
  const stripe = await source('lib/stripe.ts');
  assert.match(webhook, /verifyStripeWebhook/);
  assert.match(webhook, /checkout\.session\.completed/);
  assert.match(webhook, /completePayment/);
  assert.match(stripe, /HMAC/);
  assert.match(stripe, /STRIPE_WEBHOOK_SECRET/);
});

test('international fulfillment uses English reading, PDF, email route and USD tracking', async () => {
  const payment = await source('lib/payment.ts');
  const notifications = await source('lib/notifications.ts');
  const pdf = await source('app/api/pdf/[token]/route.ts');
  const meta = await source('lib/meta.ts');
  assert.match(payment, /createReadingEn/);
  assert.match(notifications, /\/en\/reading\//);
  assert.match(pdf, /createReadingPdfEn/);
  assert.match(meta, /order\.currency \|\| 'BRL'/);
});

test('admin BRL revenue does not intentionally mix international USD sales', async () => {
  const admin = await source('app/api/admin/orders/route.ts');
  assert.match(admin, /COALESCE\(currency,'BRL'\)='BRL'/);
  assert.match(admin, /locale='en-US' AND currency='USD'/);
});
