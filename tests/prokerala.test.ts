import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const prokerala = readFileSync(new URL('../lib/prokerala.ts', import.meta.url), 'utf8');
const astrology = readFileSync(new URL('../lib/astrology.ts', import.meta.url), 'utf8');
const route = readFileSync(new URL('../app/api/orders/[token]/astrology/route.ts', import.meta.url), 'utf8');
const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('Prokerala usa OAuth2 client credentials somente no backend', () => {
  assert.match(prokerala, /client_credentials/);
  assert.match(prokerala, /https:\/\/api\.prokerala\.com\/token/);
  assert.match(route, /PROKERALA_CLIENT_SECRET/);
  assert.doesNotMatch(env, /PROKERALA_CLIENT_SECRET=\S+/);
});

test('enriquecimento premium é opcional e mantém motor local como base', () => {
  assert.match(astrology, /provider=\{core:'local'\}/);
  assert.match(astrology, /enrichmentStatus:'unavailable'/);
  assert.match(route, /PROKERALA_ENABLED === '1'/);
});

test('usa astrologia ocidental tropical com Placidus e aspectos maiores', () => {
  assert.match(prokerala, /house_system: "placidus"/);
  assert.match(prokerala, /aspect_filter: "major"/);
  assert.match(prokerala, /ayanamsa: "0"/);
  assert.match(prokerala, /natal-planet-position/);
});

test('nenhum segredo real é versionado no arquivo de exemplo', () => {
  assert.match(env, /PROKERALA_CLIENT_ID=\n/);
  assert.match(env, /PROKERALA_CLIENT_SECRET=\n/);
});
