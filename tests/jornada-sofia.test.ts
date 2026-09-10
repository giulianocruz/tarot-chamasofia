import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { buildJourneySummary, JOURNEY_MODULES, journeyModulesFor } from '../lib/jornada-sofia.ts';
import type { FreeNatalPreview } from '../lib/astrology-types.ts';

const clientSource = fs.readFileSync(path.join(process.cwd(), 'app', 'jornada', 'mapa-astral', 'jornada-map-client.tsx'), 'utf8');
const pageSource = fs.readFileSync(path.join(process.cwd(), 'app', 'jornada', 'mapa-astral', 'page.tsx'), 'utf8');

const preview: FreeNatalPreview = {
  generatedAt: '2026-09-10T12:00:00.000Z',
  birth: { date: '1990-02-10', time: '10:30', place: 'Botucatu, SP, Brasil', resolvedPlace: 'Botucatu, São Paulo, Brasil', timeKnown: true },
  natal: {
    sun: { name: 'Sun', sign: 'Aquarius', degree: 21.4 },
    moon: { name: 'Moon', sign: 'Leo', degree: 9.2 },
    mercury: { name: 'Mercury', sign: 'Aquarius', degree: 3.1 },
    venus: { name: 'Venus', sign: 'Capricorn', degree: 18.8 },
    mars: { name: 'Mars', sign: 'Sagittarius', degree: 12.5 },
    ascendantSign: 'Taurus',
    ascendantDegree: 4.2,
  },
  precisionNote: 'Cálculo com horário e local informados.',
};

test('Jornada entrega uma síntese personalizada antes da captura de lead', () => {
  const summary = buildJourneySummary(preview, 'Giuliano', 'autoconhecimento');
  assert.match(summary.greeting, /Giuliano/);
  assert.match(summary.identity, /Aquário/);
  assert.match(summary.emotional, /Leão/);
  assert.match(summary.synthesis, /Ascendente em Touro/);
  assert.ok(summary.elementLabel.length > 5);
});

test('módulos priorizam o interesse sem remover o restante da Jornada', () => {
  const amor = journeyModulesFor('amor');
  assert.equal(amor[0]?.id, 'amor');
  assert.equal(amor.length, JOURNEY_MODULES.length);
  assert.ok(JOURNEY_MODULES.some((item) => item.id === 'mapa-completo' && item.priceCents === 990));
  assert.ok(JOURNEY_MODULES.some((item) => item.id === 'chakras'));
  assert.ok(JOURNEY_MODULES.some((item) => item.id === 'animal-poder'));
});

test('fluxo usa cálculo real e captura e-mail só depois do resultado', () => {
  assert.match(clientSource, /\/api\/astrology\/free-preview/);
  assert.match(clientSource, /setResult\(data\.preview/);
  assert.match(clientSource, /\/api\/leads/);
  assert.match(clientSource, /LIBERAR MEU PDF GRÁTIS/);
  assert.match(clientSource, /navigator\.share/);
  assert.doesNotMatch(clientSource, /compartilh.*required/i);
});

test('landing comunica gratuidade sem prometer previsão determinista', () => {
  assert.match(pageSource, /100% GRÁTIS · SEM CARTÃO/);
  assert.match(pageSource, /linguagem simbólica de reflexão/);
  assert.match(pageSource, /Você recebe valor antes de qualquer oferta/);
});
