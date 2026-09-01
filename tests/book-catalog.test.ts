import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOK_CATALOG, discountPercent, getBook } from '../lib/book-catalog.ts';

test('catálogo usa preços promocionais definidos no servidor', () => {
  assert.equal(getBook('exu-guardioes')?.promoCents, 499);
  assert.equal(getBook('pomba-gira')?.promoCents, 499);
  assert.equal(getBook('preto-velho')?.promoCents, 499);
  assert.equal(getBook('tarot-iniciantes')?.promoCents, 990);
  assert.equal(BOOK_CATALOG.length, 4);
});

test('descontos exibidos são calculados a partir dos preços reais', () => {
  assert.equal(discountPercent({ originalCents: 2190, promoCents: 499 }), 77);
  assert.equal(discountPercent({ originalCents: 2990, promoCents: 990 }), 67);
});