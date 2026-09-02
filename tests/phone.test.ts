import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBrazilPhoneInput, normalizeBrazilPhone } from '../lib/phone.ts';

test('normaliza celular brasileiro local para E.164 sem sinal',()=>{
  assert.equal(normalizeBrazilPhone('(14) 99819-3831'),'5514998193831');
  assert.equal(normalizeBrazilPhone('5514998193831'),'5514998193831');
});

test('rejeita telefone incompleto',()=>{
  assert.equal(normalizeBrazilPhone('9981-9383'),'');
});

test('formata digitação de celular',()=>{
  assert.equal(formatBrazilPhoneInput('14998193831'),'(14) 99819-3831');
});
