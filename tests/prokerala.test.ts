import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fetchProkeralaNatalEnrichment } from '../lib/prokerala.ts';

const prokerala = readFileSync(new URL('../lib/prokerala.ts', import.meta.url), 'utf8');
const astrology = readFileSync(new URL('../lib/astrology.ts', import.meta.url), 'utf8');
const route = readFileSync(new URL('../app/api/orders/[token]/astrology/route.ts', import.meta.url), 'utf8');
const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('Prokerala usa OAuth2 client credentials somente no backend', () => {
  assert.match(prokerala, /client_credentials/);
  assert.match(prokerala, /https:\/\/api\.prokerala\.com\/token/);
  assert.match(route, /PROKERALA_CLIENT_SECRET/);
  assert.doesNotMatch(env, /PROKERALA_CLIENT_SECRET=\S+/);
});

test('enriquecimento premium é opcional e mantém motor local como base', () => {
  assert.match(astrology, /provider=\{core:'local'\}/);
  assert.match(astrology, /enrichmentStatus:'unavailable'/);
  assert.match(route, /PROKERALA_ENABLED === '1'/);
});

test('serializa o perfil natal exatamente como o SDK oficial da Prokerala', () => {
  assert.match(prokerala, /"profile\[datetime\]": input\.datetime/);
  assert.match(prokerala, /"profile\[coordinates\]"/);
  assert.match(prokerala, /"profile\[birth_time_unknown\]"/);
  assert.doesNotMatch(prokerala, /JSON\.stringify\(\{\s*datetime: input\.datetime/);
});

test('usa astrologia ocidental tropical com Placidus', () => {
  assert.match(prokerala, /house_system: "placidus"/);
  assert.match(prokerala, /ayanamsa: "0"/);
  assert.match(prokerala, /natal-planet-position/);
});

test('nenhum segredo real é versionado no arquivo de exemplo', () => {
  assert.match(env, /PROKERALA_CLIENT_ID=\r?\n/);
  assert.match(env, /PROKERALA_CLIENT_SECRET=\r?\n/);
});

test('Prokerala renova token OAuth após 401 e devolve posições válidas', async () => {
  const originalFetch = globalThis.fetch;
  let tokenCalls = 0;
  let natalCalls = 0;
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === 'https://api.prokerala.com/token') {
        tokenCalls++;
        return Response.json({ access_token: `test-token-${tokenCalls}`, expires_in: 3600 });
      }
      if (url.startsWith('https://api.prokerala.com/v2/astrology/natal-planet-position?')) {
        natalCalls++;
        const authorization = new Headers(init?.headers).get('Authorization');
        assert.equal(authorization, `Bearer test-token-${natalCalls}`);
        if (natalCalls === 1) return Response.json({ error: 'expired' }, { status: 401 });
        return Response.json({ status: 'success', data: {
          planet_positions: [{ name: 'Sun', zodiac: { name: 'Aries' }, house_number: 10 }],
          houses: [], aspects: [],
        } });
      }
      throw new Error('Unexpected test URL');
    };
    const result = await fetchProkeralaNatalEnrichment(
      { clientId: 'test-rotation-one', clientSecret: 'test-only' },
      { datetime: '1990-02-12T14:20:00-03:00', latitude: -22.88, longitude: -48.45, timeKnown: true },
    );
    assert.equal(result.planets[0].name, 'Sol');
    assert.equal(result.planets[0].sign, 'Áries');
    assert.equal(tokenCalls, 2);
    assert.equal(natalCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Prokerala rejeita resposta 200 incompleta em vez de marcar enriquecimento como concluído', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      if (String(input) === 'https://api.prokerala.com/token') {
        return Response.json({ access_token: 'test-token-incomplete', expires_in: 3600 });
      }
      return Response.json({ status: 'success', data: { houses: [], aspects: [] } });
    };
    await assert.rejects(
      fetchProkeralaNatalEnrichment(
        { clientId: 'test-incomplete-two', clientSecret: 'test-only' },
        { datetime: '1990-02-12T14:20:00-03:00', latitude: -22.88, longitude: -48.45, timeKnown: true },
      ),
      /mapa natal incompleto/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
