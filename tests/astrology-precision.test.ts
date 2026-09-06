import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const astrology = readFileSync(new URL('../lib/astrology.ts', import.meta.url), 'utf8');

test('Ascendente natal vem do grau natal e exige horário conhecido', () => {
  assert.doesNotMatch(astrology, /ascendantSign:transits\.ascendant/);
  assert.match(astrology, /ascendantSign:birth\.timeKnown \? zodiacSignFromDegree\(Number\(chart\.ascendant\)\) : undefined/);
  assert.match(astrology, /ascendantDegree:birth\.timeKnown && Number\.isFinite/);
});

test('casas natais são omitidas quando o horário não é conhecido', () => {
  assert.match(astrology, /function planet\([^)]*includeHouse=true/);
  assert.match(astrology, /house:includeHouse && raw\.house/);
  assert.match(astrology, /selectHighlights\(transits\.transit_relation,birth\.timeKnown\)/);
  assert.match(astrology, /natalHouse:includeHouse && item\.natal_house/);
  assert.match(astrology, /Ascendente, casas e qualquer interpretação dependente deles são omitidos/);
});

test('trânsitos continuam disponíveis sem fabricar precisão de casa', () => {
  assert.match(astrology, /transitMeaning\(item,includeHouse\)/);
  assert.match(astrology, /Sol e trânsitos planetários continuam úteis/);
});
