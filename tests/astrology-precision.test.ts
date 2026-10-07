import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const astrology = readFileSync(new URL('../lib/astrology.ts', import.meta.url), 'utf8');

test('astrologia não depende mais da chave paga da AstrologyAPI', () => {
  assert.doesNotMatch(astrology, /ASTROLOGY_API_KEY/);
  assert.doesNotMatch(astrology, /json\.astrologyapi\.com/);
  assert.match(astrology, /natalengine\/astrology/);
  assert.match(astrology, /geocoding-api\.open-meteo\.com/);
});

test('Ascendente exige horário conhecido e vem do cálculo natal', () => {
  assert.match(astrology, /ascendantSign:birth\.timeKnown/);
  assert.match(astrology, /chart\.rising/);
  assert.match(astrology, /ascendantDegree:birth\.timeKnown/);
});

test('fuso histórico usa IANA e casas não são inventadas', () => {
  assert.match(astrology, /Intl\.DateTimeFormat/);
  assert.match(astrology, /utcOffsetAt/);
  assert.match(astrology, /house:undefined/);
  assert.match(astrology, /não atribui casas natais sem uma cúspide de casas explicitamente calculada/);
});

test('trânsitos são calculados localmente por aspectos entre posições natais e atuais', () => {
  assert.match(astrology, /currentHighlights/);
  assert.match(astrology, /angularDistance/);
  assert.match(astrology, /Conjunction/);
  assert.match(astrology, /Opposition/);
  assert.match(astrology, /Square/);
  assert.match(astrology, /Trine/);
  assert.match(astrology, /Sextile/);
});
