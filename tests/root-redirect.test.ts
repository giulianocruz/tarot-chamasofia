import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { consultationUrl } from '../lib/paid-traffic.ts';

const root = path.join(process.cwd(), 'app', 'page.tsx');
const source = fs.readFileSync(root, 'utf8');

test('raiz sempre redireciona para /consulta', () => {
  assert.match(source, /redirect\(consultationUrl\(params\)\)/);
  assert.doesNotMatch(source, /LandingClient/);
  assert.doesNotMatch(source, /shouldUseConsulta/);
});

test('redirect preserva parâmetros da campanha', () => {
  const url = consultationUrl({ utm_source:'facebook', utm_campaign:'nova_campanha', fbclid:'abc123', utm_content:'criativo_2' });
  assert.match(url, /^\/consulta\?/);
  assert.match(url, /utm_source=facebook/);
  assert.match(url, /utm_campaign=nova_campanha/);
  assert.match(url, /fbclid=abc123/);
  assert.match(url, /utm_content=criativo_2/);
});
