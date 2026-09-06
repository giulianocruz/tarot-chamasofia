import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const reading = readFileSync(new URL('../app/leitura/[token]/reading-client.tsx', import.meta.url), 'utf8');

test('compartilhamento nunca expõe o token privado da leitura', () => {
  assert.doesNotMatch(reading, /const url = location\.href/);
  assert.doesNotMatch(reading, /\? location\.href :/);
  assert.match(reading, /\/consulta\?utm_source=share&utm_medium=referral&utm_campaign=leitura_compartilhada/);
  assert.match(reading, /utm_source=whatsapp&utm_medium=referral&utm_campaign=leitura_compartilhada/);
});

test('usuário pode retomar a astrologia depois de pular por erro temporário', () => {
  assert.match(reading, /isAstroTarot && !order\.astrology && skipAstro/);
  assert.match(reading, /setSkipAstro\(false\)/);
  assert.match(reading, /GERAR MINHA PARTE ASTROLÓGICA/);
});
