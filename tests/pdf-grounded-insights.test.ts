import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const pdf = readFileSync(new URL('../lib/pdf.ts', import.meta.url), 'utf8');

test('PDF não usa placares artificiais derivados do número das cartas', () => {
  assert.doesNotMatch(pdf, /symbolicScore/);
  assert.doesNotMatch(pdf, /indicador simb/);
  assert.doesNotMatch(pdf, /width \* \(value \/ 100\)/);
});

test('PDF resume a tiragem com sinais explicáveis das três cartas', () => {
  assert.match(pdf, /insightPanel\(map, 'Agora', cards\[0\], cards\[0\]\.general/);
  assert.match(pdf, /insightPanel\(map, 'Influência', cards\[1\], cards\[1\]\.alert/);
  assert.match(pdf, /insightPanel\(map, 'Direção', cards\[2\], cards\[2\]\.constructive/);
  assert.match(pdf, /não são pontuações nem medições objetivas/);
});

test('PDF exibe a nota de precisão astrológica no resultado', () => {
  assert.match(pdf, /astrology\.precisionNote/);
});
