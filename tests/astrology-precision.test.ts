import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const astrology = readFileSync(new URL('../lib/astrology.ts', import.meta.url), 'utf8');
const provider = readFileSync(new URL('../lib/natalchart-api.ts', import.meta.url), 'utf8');

test('astrologia não depende mais da chave paga da AstrologyAPI antiga', () => {
  assert.doesNotMatch(astrology, /ASTROLOGY_API_KEY/);
  assert.doesNotMatch(astrology, /json\.astrologyapi\.com/);
  assert.match(astrology, /natalchart-api/);
  assert.match(astrology, /geocoding-api\.open-meteo\.com/);
});

test('provedor principal usa NatalChart API e mantém a chave somente no backend', () => {
  assert.match(provider, /api\.natalchart\.ai/);
  assert.match(provider, /NATALCHART_API_KEY/);
  assert.match(provider, /\/v1\/chart\/full/);
  assert.match(provider, /\/v1\/sky/);
  assert.match(provider, /Authorization/);
});

test('data, hora, coordenadas e timezone IANA são enviados ao cálculo natal', () => {
  assert.match(astrology, /latitude: place\.latitude/);
  assert.match(astrology, /longitude: place\.longitude/);
  assert.match(astrology, /timezone: place\.timezone/);
  assert.match(astrology, /time: input\.timeKnown \? time : null/);
});

test('Ascendente, Meio do Céu e casas só são expostos quando o horário é conhecido', () => {
  assert.match(astrology, /ascendantSign: timeKnown/);
  assert.match(astrology, /midheavenSign: timeKnown/);
  assert.match(astrology, /houseCusps: timeKnown/);
  assert.match(astrology, /api\?\.houses/);
});

test('fallback preserva fuso histórico IANA e não fabrica casas premium', () => {
  assert.match(astrology, /Intl\.DateTimeFormat/);
  assert.match(astrology, /utcOffsetAt/);
  assert.match(astrology, /natalengine\/astrology/);
  assert.match(astrology, /provedor astrológico principal estava indisponível/i);
});

test('resultado de alta precisão identifica Swiss Ephemeris', () => {
  assert.match(astrology, /Swiss Ephemeris/);
  assert.match(astrology, /Casas Placidus/);
});

test('trânsitos são calculados por aspectos entre posições natais e atuais', () => {
  assert.match(astrology, /currentHighlights/);
  assert.match(astrology, /angularDistance/);
  assert.match(astrology, /Conjunction/);
  assert.match(astrology, /Opposition/);
  assert.match(astrology, /Square/);
  assert.match(astrology, /Trine/);
  assert.match(astrology, /Sextile/);
});
