// Auditoria read-only: nunca cria pedidos nem inicia cobranças.
// Uso: npm run smoke:production
const base = (process.env.CHAMA_TAROT_ORIGIN || 'https://tarot.chamasofia.com.br').replace(/\/+$/, '');
const expected = process.env.EXPECTED_RELEASE || 'premium-final-20261008';
const url = new URL(base);
if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('O ambiente de produção precisa usar HTTPS.');
}

let failures = 0;
async function get(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(12000), headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}
async function check(name, fn) {
  try {
    const message = await fn();
    console.log(`OK  ${name}${message ? ': ' + message : ''}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
await check('Identidade e infraestrutura', async () => {
  const health = await (await get('/api/health')).json();
  if (!health.ok || health.database !== 'ok' || health.ebook !== 'ok') throw new Error('banco ou acervo indisponível');
  if (health.release !== expected) throw new Error(`versão ${health.release ?? 'desconhecida'} diferente da esperada ${expected}`);
  if (health.capabilities?.tarot78 !== true || health.capabilities?.spreads !== 8 || health.capabilities?.maxCards !== 12) {
    throw new Error('baralho ou tiragens incompletos');
  }
  if (health.capabilities?.premiumAstrologyConfigured !== true) throw new Error('Prokerala premium desativada');
  if (health.capabilities?.paymentConfigured !== true) throw new Error('checkout automático não configurado');
  return expected;
});
for (const path of ['/consulta', '/astrotarot', '/api/pricing?offer=astro-tarot', '/api/books/status', '/robots.txt', '/sitemap.xml']) {
  await check(path, async () => {
    const response = await get(path);
    if (path.startsWith('/api/') && !(response.headers.get('content-type') || '').includes('application/json')) {
      throw new Error('resposta não é JSON');
    }
    return String(response.status);
  });
}
console.log(`Resultado: ${failures === 0 ? 'APROVADO' : failures + ' pendência(s)'}.`);
process.exitCode = failures ? 1 : 0;
