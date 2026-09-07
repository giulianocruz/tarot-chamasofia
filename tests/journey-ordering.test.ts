import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const events=readFileSync(new URL('../app/api/events/route.ts',import.meta.url),'utf8');
const admin=readFileSync(new URL('../app/api/admin/orders/route.ts',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/oraculo-gestao-7f3a/admin-client.tsx',import.meta.url),'utf8');

test('API persiste ordem e horário causal do cliente',()=>{
  assert.match(events,/client_event_seq/);
  assert.match(events,/client_event_ts/);
  assert.match(events,/analyticsMetadata\(context, eventMetadata\)/);
});

test('admin consolida jornadas recentes sem expor identificador',()=>{
  assert.match(admin,/recentEventRows/);
  assert.match(admin,/recentJourneys/);
  assert.match(admin,/client_event_seq/);
  assert.match(client,/Jornadas recentes/);
  assert.doesNotMatch(client,/actorId/);
});