import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('../app/consulta/preview-dashboard.tsx', import.meta.url), 'utf8');

test('prévia usa significados reais das cartas em vez de placares artificiais', () => {
  assert.doesNotMatch(preview, /symbolicBand/);
  assert.doesNotMatch(preview, /preview-meter/);
  assert.match(preview, /keywords\.slice\(0, 2\)/);
  assert.match(preview, /cards\[1\]\?\.alert/);
  assert.match(preview, /cards\[2\]\?\.constructive/);
});

test('prévia preserva valor pago sem esconder o que já foi aberto', () => {
  assert.match(preview, /1\/4/);
  assert.match(preview, /após o Pix/);
  assert.match(preview, /Leitura das 3 cartas em conjunto/);
  assert.match(preview, /Tarot \+ mapa natal \+ céu atual/);
});
