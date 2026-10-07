import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const pdf = readFileSync(new URL('../lib/pdf.ts', import.meta.url), 'utf8');

test('PDF não usa placares artificiais derivados do número das cartas', () => {
  assert.doesNotMatch(pdf, /symbolicScore/);
  assert.doesNotMatch(pdf, /indicador simb/);
  assert.doesNotMatch(pdf, /width \* \(value \/ 100\)/);
});

test('PDF resume a tiragem com sinais explicáveis das cartas escolhidas', () => {
  assert.match(pdf, /const overviewCards = cards\.slice\(0, 3\)/);
  assert.match(pdf, /reading\.cardReadings\[index\]\?\.position/);
  assert.match(pdf, /card\.general/);
  assert.match(pdf, /card\.constructive/);
  assert.match(pdf, /card\.alert/);
  assert.match(pdf, /não são pontuações nem medições objetivas/);
});

test('PDF adapta a capa à quantidade real de cartas da tiragem', () => {
  assert.match(pdf, /cards\.length/);
  assert.match(pdf, /carta escolhida/);
  assert.match(pdf, /cartas escolhidas/);
});

test('PDF exibe a nota de precisão astrológica no resultado', () => {
  assert.match(pdf, /astrology\.precisionNote/);
});
