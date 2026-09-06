import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const consulta=readFileSync(new URL('../app/consulta/consulta-client.tsx',import.meta.url),'utf8');

test('rascunho local expira em 24h e não persiste pergunta privada',()=>{
  assert.match(consulta,/JOURNEY_DRAFT_TTL = 24 \* 60 \* 60 \* 1000/);
  assert.match(consulta,/sessionStorage\.setItem\(PRIVATE_QUESTION_KEY, question\)/);
  assert.doesNotMatch(consulta,/localStorage\.setItem\(PRIVATE_QUESTION_KEY/);
  assert.match(consulta,/presetQuestion/);
});

test('retomada local valida tema e cartas antes de restaurar',()=>{
  assert.match(consulta,/CATEGORY_MAP\.some\(\(\[name\]\) => name === draft\.category\)/);
  assert.match(consulta,/getCards\(draft\.confirmedCards\)\.length !== 3/);
  assert.match(consulta,/local_draft_resumed/);
});

test('troca de tema limpa estado e checkout concluído limpa rascunho',()=>{
  assert.match(consulta,/setCategory\(value\); setQuestion\(""\); setSelected\(\[\]\)/);
  assert.match(consulta,/persistJourneyDraft\(value\)/);
  assert.match(consulta,/emitEvent\("pix_generated"[\s\S]*?clearJourneyDraft\(\)/);
});
