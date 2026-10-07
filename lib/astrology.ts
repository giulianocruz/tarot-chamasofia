import calculateAstrology from 'natalengine/astrology';
import type { Category, TarotCard } from './tarot';
import type { AstroPlanet, AstroTarotLayer, AstroTransitHighlight, BirthInput } from './astrology-types';
import { localizeAstrologyEn } from './astrology-en';
import {
  fetchNatalChart,
  fetchNatalSky,
  natalChartApiConfigured,
  type NatalChartResponse,
  type NatalChartPlanet,
} from './natalchart-api';

type EnginePosition = {
  sign?: { name?: string };
  longitude?: number;
  degree?: string;
  degreeInSign?: number;
  house?: number;
  retrograde?: boolean;
};
type EngineChart = {
  sun?: EnginePosition;
  moon?: EnginePosition;
  rising?: EnginePosition;
  planets?: Record<string, EnginePosition>;
};
type Place = {
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode?: string;
};
type ChartSource = 'natalchart' | 'local';

const SIGN_PT: Record<string, string> = {
  Aries: 'Áries', Taurus: 'Touro', Gemini: 'Gêmeos', Cancer: 'Câncer', Leo: 'Leão', Virgo: 'Virgem',
  Libra: 'Libra', Scorpio: 'Escorpião', Sagittarius: 'Sagitário', Capricorn: 'Capricórnio', Aquarius: 'Aquário', Pisces: 'Peixes',
};
const PLANETS = [
  ['Sun', 'sun'], ['Moon', 'moon'], ['Mercury', 'mercury'], ['Venus', 'venus'], ['Mars', 'mars'],
  ['Jupiter', 'jupiter'], ['Saturn', 'saturn'], ['Uranus', 'uranus'], ['Neptune', 'neptune'], ['Pluto', 'pluto'],
] as const;
const ASPECTS = [
  { name: 'Conjunction', angle: 0, orb: 6, weight: 6 },
  { name: 'Opposition', angle: 180, orb: 5, weight: 5 },
  { name: 'Square', angle: 90, orb: 4, weight: 5 },
  { name: 'Trine', angle: 120, orb: 4, weight: 4 },
  { name: 'Sextile', angle: 60, orb: 3, weight: 3 },
] as const;
const PLANET_WEIGHT: Record<string, number> = {
  Pluto: 10, Neptune: 9, Uranus: 9, Saturn: 8, Jupiter: 7, Mars: 6, Venus: 6, Mercury: 5, Sun: 5, Moon: 4,
};

function parseDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? { year, month, day } : null;
}

function parseTime(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]), min = Number(m[2]);
  return hour <= 23 && min <= 59 ? { hour, min } : null;
}

export function validateBirthInput(input: BirthInput) {
  const date = parseDate(input.birthDate);
  const currentYear = new Date().getUTCFullYear();
  if (!date || date.year < 1900 || date.year > currentYear) throw new Error('Informe uma data de nascimento válida.');
  const time = input.timeKnown ? parseTime(input.birthTime) : { hour: 12, min: 0 };
  if (!time) throw new Error('Informe um horário de nascimento válido.');
  const place = String(input.birthPlace || '').trim().replace(/\s+/g, ' ').slice(0, 140);
  if (place.length < 3) throw new Error('Informe cidade, estado e país de nascimento.');
  return { ...date, ...time, place, timeKnown: Boolean(input.timeKnown) };
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function fetchJson<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ChamaSofia/1.0' } });
    if (!response.ok) throw new Error('Serviço de localização indisponível.');
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

async function searchPlaces(query: string): Promise<Place[]> {
  const data = await fetchJson<{ results?: Array<{ name?: string; admin1?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; country_code?: string }> }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=pt&format=json`,
  );
  return (data.results || [])
    .filter((x) => Number.isFinite(x.latitude) && Number.isFinite(x.longitude) && x.timezone)
    .map((x) => ({
      name: String(x.name || ''),
      label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
      latitude: Number(x.latitude),
      longitude: Number(x.longitude),
      timezone: String(x.timezone),
      countryCode: x.country_code,
    }));
}

async function resolveBirthLocation(place: string) {
  const city = place.split(',')[0].trim();
  const target = normalize(city);
  const countryHint = /\b(brasil|brazil|br)\b/i.test(normalize(place)) ? 'BR' : '';
  const queries = Array.from(new Set([place, city, city.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]));
  const candidates: Place[] = [];
  for (const query of queries) {
    candidates.push(...await searchPlaces(query));
    if (candidates.some((p) => normalize(p.name) === target && (!countryHint || p.countryCode === countryHint))) break;
  }
  const match =
    candidates.find((p) => normalize(p.name) === target && (!countryHint || p.countryCode === countryHint)) ||
    candidates.find((p) => !countryHint || p.countryCode === countryHint) ||
    candidates[0];
  if (!match) throw new Error('Não encontramos essa cidade. Tente informar como “Cidade, Estado, Brasil”.');
  return match;
}

function wallClockMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`);
}

function utcOffsetAt(date: string, time: string, timeZone: string) {
  const target = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(target)) throw new Error('Data ou horário inválido.');
  let utc = target;
  for (let i = 0; i < 3; i += 1) utc += target - wallClockMs(utc, timeZone);
  return (target - utc) / 3600000;
}

function apiPosition(item?: NatalChartPlanet): EnginePosition | undefined {
  if (!item) return undefined;
  return {
    sign: { name: item.sign },
    longitude: item.longitude,
    degreeInSign: item.degreeInSign,
    house: item.house,
    retrograde: item.retrograde,
  };
}

function apiChartToEngine(data: NatalChartResponse): EngineChart {
  const byName = new Map((data.planets || []).map((item) => [item.name.toLowerCase(), item]));
  const planets: Record<string, EnginePosition> = {};
  for (const item of data.planets || []) planets[item.name.toLowerCase()] = apiPosition(item)!;
  const asc = data.angles?.ascendant;
  return {
    sun: apiPosition(byName.get('sun')),
    moon: apiPosition(byName.get('moon')),
    rising: asc ? { sign: { name: asc.sign }, longitude: asc.longitude } : undefined,
    planets,
  };
}

function skyToEngine(data: { positions?: Array<{ name: string; longitude: number; sign: string; degreeInSign?: number; retrograde?: boolean }> }): EngineChart {
  const byName = new Map((data.positions || []).map((item) => [item.name.toLowerCase(), item]));
  const positionFor = (name: string): EnginePosition | undefined => {
    const item = byName.get(name);
    return item ? {
      sign: { name: item.sign },
      longitude: item.longitude,
      degreeInSign: item.degreeInSign,
      retrograde: item.retrograde,
    } : undefined;
  };
  const planets: Record<string, EnginePosition> = {};
  for (const item of data.positions || []) planets[item.name.toLowerCase()] = positionFor(item.name.toLowerCase())!;
  return { sun: positionFor('sun'), moon: positionFor('moon'), planets };
}

function position(chart: EngineChart, key: string) {
  return key === 'sun' ? chart.sun : key === 'moon' ? chart.moon : chart.planets?.[key];
}

function astroPlanet(chart: EngineChart, name: string, key: string): AstroPlanet | undefined {
  const raw = position(chart, key);
  const lon = Number(raw?.longitude);
  if (!raw || !Number.isFinite(lon)) return undefined;
  const degree = Number.isFinite(Number(raw.degreeInSign)) ? Number(raw.degreeInSign) : ((lon % 30) + 30) % 30;
  return {
    name,
    sign: SIGN_PT[String(raw.sign?.name || '')] || String(raw.sign?.name || ''),
    degree,
    retrograde: typeof raw.retrograde === 'boolean' ? raw.retrograde : undefined,
    house: Number.isFinite(Number(raw.house)) ? Number(raw.house) : undefined,
  };
}

function engineChart(date: string, hour: number, offset: number, lat: number, lon: number): EngineChart {
  return calculateAstrology(date, hour, offset, lat, lon) as EngineChart;
}

function localChartForBirth(input: ReturnType<typeof validateBirthInput>, place: Place) {
  const date = `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
  const time = `${String(input.hour).padStart(2, '0')}:${String(input.min).padStart(2, '0')}`;
  const offset = utcOffsetAt(date, time, place.timezone);
  return {
    chart: engineChart(date, input.hour + input.min / 60, offset, place.latitude, place.longitude),
    source: 'local' as ChartSource,
    api: undefined as NatalChartResponse | undefined,
  };
}

async function chartForBirth(input: ReturnType<typeof validateBirthInput>, place: Place) {
  const date = `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
  const time = `${String(input.hour).padStart(2, '0')}:${String(input.min).padStart(2, '0')}`;
  if (natalChartApiConfigured()) {
    try {
      const api = await fetchNatalChart({
        date,
        time: input.timeKnown ? time : null,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      });
      return { chart: apiChartToEngine(api), source: 'natalchart' as ChartSource, api };
    } catch (error) {
      console.error('NatalChart API failed; using controlled local fallback', error);
    }
  }
  return localChartForBirth(input, place);
}

async function chartNow(place: Place) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  if (natalChartApiConfigured()) {
    try {
      const api = await fetchNatalSky(date);
      return { chart: skyToEngine(api), date, source: 'natalchart' as ChartSource };
    } catch (error) {
      console.error('NatalChart sky failed; using local transit fallback', error);
    }
  }
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  return { chart: engineChart(date, hour, 0, place.latitude, place.longitude), date, source: 'local' as ChartSource };
}

function angularDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function currentHighlights(natal: EngineChart, transit: EngineChart) {
  const hits: Array<AstroTransitHighlight & { score: number }> = [];
  for (const [transitName, transitKey] of PLANETS) {
    const t = position(transit, transitKey);
    const tl = Number(t?.longitude);
    if (!Number.isFinite(tl)) continue;
    for (const [natalName, natalKey] of PLANETS) {
      const n = position(natal, natalKey);
      const nl = Number(n?.longitude);
      if (!Number.isFinite(nl)) continue;
      const distance = angularDistance(tl, nl);
      for (const aspect of ASPECTS) {
        const delta = Math.abs(distance - aspect.angle);
        if (delta > aspect.orb) continue;
        const item = {
          transitPlanet: transitName,
          natalPlanet: natalName,
          aspectType: aspect.name,
          transitSign: SIGN_PT[String(t?.sign?.name || '')] || String(t?.sign?.name || ''),
          retrograde: Boolean(t?.retrograde),
          meaning: '',
          score: (PLANET_WEIGHT[transitName] || 2) + aspect.weight + (aspect.orb - delta),
        };
        item.meaning = transitMeaning(item);
        hits.push(item);
        break;
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 5).map(({ score, ...item }) => item);
}

function transitMeaning(item: AstroTransitHighlight) {
  const tension = ['Square', 'Opposition'].includes(item.aspectType);
  return `${item.transitPlanet} em ${item.aspectType.toLowerCase()} com ${item.natalPlanet} ${tension ? 'pede ajuste consciente, limites e revisão de padrões' : 'favorece integração, percepção e movimento intencional'}.`;
}

function categoryFocus(category: Category) {
  if (category === 'Amor e relacionamentos') return 'vínculos, reciprocidade e limites afetivos';
  if (category === 'Dinheiro') return 'recursos, segurança e decisões materiais';
  if (category === 'Trabalho e carreira') return 'direção profissional, visibilidade e responsabilidade';
  return 'clareza, escolha e consequências do próximo passo';
}

function buildSituation(category: Category, highlights: AstroTransitHighlight[], natal: AstroTarotLayer['natal']) {
  const main = highlights[0], identity = natal.sun?.sign ? `Seu Sol em ${natal.sun.sign}` : 'Seu mapa natal';
  return main
    ? `${identity} encontra um céu que destaca ${main.transitPlanet} em ${main.aspectType.toLowerCase()} com ${main.natalPlanet}. Para ${categoryFocus(category)}, isso sugere observação ativa antes de acelerar uma resposta.`
    : `${identity} oferece a base da leitura. Para ${categoryFocus(category)}, separe impulso, expectativa e fatos antes de decidir.`;
}

function buildCardsBridge(cards: TarotCard[], highlights: AstroTransitHighlight[]) {
  const transit = highlights[0], sky = transit ? `${transit.transitPlanet}/${transit.aspectType}` : 'o céu atual';
  const first = cards[0], second = cards[1] || first, third = cards[2] || second;
  if (!first) return `O céu atual (${sky}) oferece uma camada adicional de contexto para sua pergunta.`;
  if (cards.length === 1) return `${first.name} concentra a mensagem da tiragem. Cruzada com ${sky}, ela convida a observar qual resposta sua combina melhor com este momento.`;
  return `${first.name} descreve o ponto de partida, ${second.name} mostra uma força relevante e ${third.name} aponta uma direção possível. Cruzadas com ${sky}, as cartas deixam de buscar uma previsão rígida e passam a orientar uma resposta consciente.`;
}

function buildSolution(cards: TarotCard[], highlights: AstroTransitHighlight[]): AstroTarotLayer['solution'] {
  const first = cards[0], second = cards[1] || first, third = cards[2] || second, transit = highlights[0];
  if (!first) return { title: 'Astro + Tarot · sua orientação prática', steps: [] };
  return {
    title: 'Astro + Tarot · sua orientação prática',
    steps: [
      { title: '1. Nomeie o que é real', text: `Use ${first.name} para separar fatos de ansiedade. ${transit?.meaning || 'Observe o cenário antes de responder automaticamente.'}` },
      { title: '2. Trabalhe a força em jogo', text: `${second.name} pede atenção a ${second.keywords.slice(0, 2).join(' e ')}. Escolha um limite, conversa ou ajuste concreto sob seu controle.` },
      { title: '3. Faça um movimento testável', text: `${third.name} favorece ${third.constructive.toLowerCase()}. Prefira um próximo passo pequeno, reversível e coerente com seus valores.` },
    ],
  };
}

function natalDetails(chart: EngineChart, api: NatalChartResponse | undefined, timeKnown: boolean): AstroTarotLayer['natal'] {
  const asc = api?.angles?.ascendant;
  const mc = api?.angles?.midheaven;
  return {
    sun: astroPlanet(chart, 'Sun', 'sun'),
    moon: astroPlanet(chart, 'Moon', 'moon'),
    mercury: astroPlanet(chart, 'Mercury', 'mercury'),
    venus: astroPlanet(chart, 'Venus', 'venus'),
    mars: astroPlanet(chart, 'Mars', 'mars'),
    jupiter: astroPlanet(chart, 'Jupiter', 'jupiter'),
    saturn: astroPlanet(chart, 'Saturn', 'saturn'),
    ascendantSign: timeKnown ? (SIGN_PT[String(asc?.sign || chart.rising?.sign?.name || '')] || String(asc?.sign || chart.rising?.sign?.name || '')) : undefined,
    ascendantDegree: timeKnown && Number.isFinite(Number(asc?.longitude ?? chart.rising?.longitude))
      ? Number(asc?.longitude ?? chart.rising?.longitude) % 30
      : undefined,
    midheavenSign: timeKnown && mc?.sign ? (SIGN_PT[mc.sign] || mc.sign) : undefined,
    midheavenDegree: timeKnown && Number.isFinite(Number(mc?.longitude)) ? Number(mc?.longitude) % 30 : undefined,
    houseCusps: timeKnown && api?.houses?.length
      ? api.houses.map((house) => ({ ...house, sign: SIGN_PT[house.sign] || house.sign }))
      : undefined,
  };
}

export async function createAstroTarotLayer(
  input: BirthInput,
  question: string,
  category: Category,
  cards: TarotCard[],
  locale = 'pt-BR',
): Promise<AstroTarotLayer> {
  const birth = validateBirthInput(input);
  const place = await resolveBirthLocation(birth.place);
  const [birthData, current] = await Promise.all([chartForBirth(birth, place), chartNow(place)]);
  const chart = birthData.chart;
  const highlights = currentHighlights(chart, current.chart);
  const natal = natalDetails(chart, birthData.api, birth.timeKnown);
  const precise = birthData.source === 'natalchart';
  const layer: AstroTarotLayer = {
    generatedAt: new Date().toISOString(),
    transitDate: current.date,
    birth: {
      date: input.birthDate,
      time: birth.timeKnown ? input.birthTime : 'horário não informado',
      place: birth.place,
      resolvedPlace: place.label,
      timeKnown: birth.timeKnown,
    },
    natal,
    current: { ascendant: undefined, highlights },
    situation: buildSituation(category, highlights, natal),
    cardsBridge: buildCardsBridge(cards, highlights),
    solution: buildSolution(cards, highlights),
    reflection: 'Se o céu descreve o clima e as cartas descrevem sua posição dentro dele, qual escolha de hoje preserva mais a sua autonomia?',
    precisionNote: precise
      ? birth.timeKnown
        ? 'Mapa natal calculado com Swiss Ephemeris a partir da data, hora local, latitude, longitude e fuso histórico IANA. Casas Placidus, Ascendente e Meio do Céu usam o horário de nascimento informado.'
        : 'Mapa natal calculado com Swiss Ephemeris e coordenadas do local. Como o horário de nascimento não foi informado, Ascendente, Meio do Céu e casas são omitidos para não fabricar precisão.'
      : birth.timeKnown
        ? 'O provedor astrológico principal estava indisponível; usamos o motor astronômico local com coordenadas e fuso histórico. Ascendente foi calculado, mas casas e Meio do Céu premium foram omitidos.'
        : 'O provedor astrológico principal estava indisponível e o horário de nascimento não foi informado. Usamos 12:00 apenas para posições planetárias e omitimos Ascendente e casas.',
  };
  return locale.toLowerCase().startsWith('en') ? localizeAstrologyEn(layer, cards, category) : layer;
}

export async function createFreeNatalPreview(input: BirthInput) {
  const birth = validateBirthInput(input);
  const place = await resolveBirthLocation(birth.place);
  const birthData = await chartForBirth(birth, place);
  const natal = natalDetails(birthData.chart, birthData.api, birth.timeKnown);
  const precise = birthData.source === 'natalchart';
  return {
    generatedAt: new Date().toISOString(),
    birth: {
      date: input.birthDate,
      time: birth.timeKnown ? input.birthTime : 'horário não informado',
      place: birth.place,
      resolvedPlace: place.label,
      timeKnown: birth.timeKnown,
    },
    natal,
    precisionNote: precise
      ? birth.timeKnown
        ? 'Prévia calculada com Swiss Ephemeris, coordenadas do nascimento e fuso histórico IANA.'
        : 'Prévia calculada com Swiss Ephemeris. Sem horário conhecido, Ascendente, Meio do Céu e casas são omitidos.'
      : birth.timeKnown
        ? 'Prévia calculada pelo fallback astronômico local com coordenadas e fuso histórico.'
        : 'Sem horário de nascimento, usamos uma referência técnica apenas para posições planetárias e não exibimos Ascendente ou casas.',
  };
}
