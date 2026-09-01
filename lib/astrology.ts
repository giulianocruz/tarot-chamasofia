import { env } from 'cloudflare:workers';
import type { Category, TarotCard } from './tarot';
import type { AstroPlanet, AstroTarotLayer, AstroTransitHighlight, BirthInput } from './astrology-types';

const API_BASE = 'https://json.astrologyapi.com/v1';
type RawPlanet = { name?: string; sign?: string; house?: number; norm_degree?: number; is_retro?: string | boolean };
type WesternHoroscope = { planets?: RawPlanet[]; ascendant?: number };
type TransitRelation = { transit_planet?: string; natal_planet?: string; aspect_type?: string; exact_time?: string; is_retrograde?: boolean; transit_sign?: string; natal_house?: number };
type TransitResponse = { transit_date?: string; ascendant?: string; transit_relation?: TransitRelation[] };
type GeoResponse = { geonames?: Array<{ place_name?: string; latitude?: string | number; longitude?: string | number; timezone_id?: string; country_code?: string }> };
type TimezoneResponse = { status?: boolean; timezone?: number };

function apiKey() {
  return (env as unknown as Record<string, string | undefined>).ASTROLOGY_API_KEY;
}

async function astrologyRequest<T>(path: string, body: unknown, language = 'en'): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error('Astrologia temporariamente indisponível.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': language, 'x-astrologyapi-key': key },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`AstrologyAPI ${response.status}: ${message.slice(0, 180)}`);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('O cálculo astrológico demorou demais. Tente novamente.');
    throw error;
  } finally { clearTimeout(timer); }
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year=Number(match[1]), month=Number(match[2]), day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if (date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return null;
  return { year, month, day };
}
function parseTime(value: string) {
  const match=/^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour=Number(match[1]), min=Number(match[2]);
  return hour<=23 && min<=59 ? { hour, min } : null;
}

export function validateBirthInput(input: BirthInput) {
  const date=parseDate(input.birthDate);
  const currentYear=new Date().getUTCFullYear();
  if (!date || date.year<1900 || date.year>currentYear) throw new Error('Informe uma data de nascimento válida.');
  const time=input.timeKnown ? parseTime(input.birthTime) : { hour:12, min:0 };
  if (!time) throw new Error('Informe um horário de nascimento válido.');
  const place=String(input.birthPlace||'').trim().replace(/\s+/g,' ').slice(0,140);
  if (place.length<3) throw new Error('Informe cidade, estado e país de nascimento.');
  return { ...date, ...time, place, timeKnown:Boolean(input.timeKnown) };
}

async function resolveBirthLocation(place:string, month:number, day:number, year:number) {
  const city=place.split(',')[0].trim();
  const cityKey=normalize(city);
  const countryHint=/\b(brasil|brazil|br)\b/i.test(normalize(place)) ? 'BR' : '';
  const queries=Array.from(new Set([place,city,city.normalize('NFD').replace(/[\u0300-\u036f]/g,'')]));
  const candidates:NonNullable<GeoResponse['geonames']>=[];
  for (const query of queries) {
    const geo=await astrologyRequest<GeoResponse>('geo_details',{ place:query, maxRows:10 });
    candidates.push(...(geo.geonames||[]));
    if (candidates.some(item=>normalize(String(item.place_name||''))===cityKey && (!countryHint || item.country_code===countryHint))) break;
  }
  const match=candidates.find(item=>normalize(String(item.place_name||''))===cityKey && (!countryHint || item.country_code===countryHint)) || candidates.find(item=>!countryHint || item.country_code===countryHint) || candidates[0];
  const lat=Number(match?.latitude), lon=Number(match?.longitude);
  if (!match || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat===0 && lon===0)) throw new Error('Não encontramos essa cidade. Tente informar como “Cidade, Estado, Brasil”.');
  const date=`${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}-${year}`;
  const tz=await astrologyRequest<TimezoneResponse>('timezone_with_dst',{ latitude:lat, longitude:lon, date });
  const tzone=Number(tz.timezone);
  if (!Number.isFinite(tzone)) throw new Error('Não foi possível determinar o fuso histórico do local informado.');
  return { lat, lon, tzone, resolvedPlace:[match.place_name,match.country_code].filter(Boolean).join(' · ')||place, timezoneId:match.timezone_id||'' };
}

function normalize(value:string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function planet(planets:RawPlanet[]|undefined, names:string[]):AstroPlanet|undefined {
  const wanted=names.map(normalize);
  const raw=(planets||[]).find((item)=>wanted.includes(normalize(String(item.name||''))));
  if (!raw) return undefined;
  return { name:String(raw.name||names[0]), sign:String(raw.sign||''), house:raw.house?Number(raw.house):undefined, degree:Number.isFinite(Number(raw.norm_degree))?Number(raw.norm_degree):undefined, retrograde:String(raw.is_retro).toLowerCase()==='true' };
}

const PLANET_WEIGHT:Record<string,number>={ Pluto:10, Neptune:9, Uranus:9, Saturn:8, Jupiter:7, Mars:6, Venus:6, Mercury:5, Sun:5, Moon:4 };
const ASPECT_WEIGHT:Record<string,number>={ Conjunction:6, Opposition:5, Square:5, Trine:4, Sextile:3 };

function transitMeaning(item:TransitRelation) {
  const tp=String(item.transit_planet||'Planeta'), np=String(item.natal_planet||'ponto natal'), aspect=String(item.aspect_type||'aspecto');
  const house=item.natal_house ? ` na casa ${item.natal_house}` : '';
  const tension=['Square','Opposition'].includes(aspect);
  return `${tp} em ${aspect.toLowerCase()} com ${np}${house} ${tension?'pede ajuste consciente, limites e revisão de padrões':'favorece integração, percepção e movimento intencional'}.`;
}
function highlightTransit(item:TransitRelation):AstroTransitHighlight {
  return {
    transitPlanet:String(item.transit_planet||'Planeta'), natalPlanet:String(item.natal_planet||'Ponto natal'),
    aspectType:String(item.aspect_type||'Aspecto'), transitSign:String(item.transit_sign||''),
    natalHouse:item.natal_house?Number(item.natal_house):undefined, retrograde:Boolean(item.is_retrograde),
    exactTime:item.exact_time?String(item.exact_time):undefined, meaning:transitMeaning(item),
  };
}

function selectHighlights(relations:TransitRelation[]|undefined) {
  return [...(relations||[])].sort((a,b)=>{
    const aw=(PLANET_WEIGHT[String(a.transit_planet)]||2)+(ASPECT_WEIGHT[String(a.aspect_type)]||1);
    const bw=(PLANET_WEIGHT[String(b.transit_planet)]||2)+(ASPECT_WEIGHT[String(b.aspect_type)]||1);
    return bw-aw;
  }).slice(0,5).map(highlightTransit);
}

function categoryFocus(category:Category) {
  if (category==='Amor e relacionamentos') return 'vínculos, reciprocidade e limites afetivos';
  if (category==='Dinheiro') return 'recursos, segurança e decisões materiais';
  if (category==='Trabalho e carreira') return 'direção profissional, visibilidade e responsabilidade';
  return 'clareza, escolha e consequências do próximo passo';
}

function buildSituation(category:Category, highlights:AstroTransitHighlight[], natal:AstroTarotLayer['natal']) {
  const focus=categoryFocus(category);
  const main=highlights[0];
  const identity=natal.sun?.sign ? `Seu Sol em ${natal.sun.sign}` : 'Seu mapa natal';
  return main ? `${identity} encontra um céu que destaca ${main.transitPlanet} em ${main.aspectType.toLowerCase()} com ${main.natalPlanet}. Para ${focus}, isso sugere um período de observação ativa: reconheça o que está sendo pressionado antes de acelerar uma resposta.` : `${identity} oferece a base da leitura. Para ${focus}, use o momento para separar impulso, expectativa e fatos antes de decidir.`;
}
function buildCardsBridge(cards:TarotCard[], highlights:AstroTransitHighlight[]) {
  const transit=highlights[0];
  const sky=transit ? `${transit.transitPlanet}/${transit.aspectType}` : 'o céu atual';
  return `${cards[0].name} descreve o ponto de partida, ${cards[1].name} mostra a força que interfere e ${cards[2].name} aponta uma direção possível. Quando cruzamos isso com ${sky}, a leitura deixa de perguntar apenas “o que vai acontecer?” e passa a perguntar “qual resposta sua combina melhor com este momento?”.`;
}

function buildSolution(cards:TarotCard[], highlights:AstroTransitHighlight[]):AstroTarotLayer['solution'] {
  const transit=highlights[0];
  return {
    title:'Astro + Tarot · sua orientação prática',
    steps:[
      { title:'1. Nomeie o que é real', text:`Use ${cards[0].name} para separar fatos de ansiedade. ${transit?.meaning || 'Observe o cenário antes de responder automaticamente.'}` },
      { title:'2. Trabalhe a força em jogo', text:`${cards[1].name} pede atenção a ${cards[1].keywords.slice(0,2).join(' e ')}. Escolha um limite, conversa ou ajuste concreto que esteja sob seu controle.` },
      { title:'3. Faça um movimento testável', text:`${cards[2].name} favorece ${cards[2].constructive.toLowerCase()}. Prefira um próximo passo pequeno, reversível e coerente com seus valores.` },
    ],
  };
}

export async function createAstroTarotLayer(input:BirthInput, question:string, category:Category, cards:TarotCard[]):Promise<AstroTarotLayer> {
  const birth=validateBirthInput(input);
  const location=await resolveBirthLocation(birth.place,birth.month,birth.day,birth.year);
  const payload={ day:birth.day, month:birth.month, year:birth.year, hour:birth.hour, min:birth.min, lat:location.lat, lon:location.lon, tzone:location.tzone, house_type:'placidus' };
  const [chart,transits]=await Promise.all([
    astrologyRequest<WesternHoroscope>('western_horoscope',{ ...payload, is_asteroids:false },'pt'),
    astrologyRequest<TransitResponse>('natal_transits/daily',payload,'en'),
  ]);
  const natal={
    sun:planet(chart.planets,['Sun','Sol']), moon:planet(chart.planets,['Moon','Lua']), mercury:planet(chart.planets,['Mercury','Mercúrio']),
    venus:planet(chart.planets,['Venus','Vênus']), mars:planet(chart.planets,['Mars','Marte']), jupiter:planet(chart.planets,['Jupiter','Júpiter']), saturn:planet(chart.planets,['Saturn','Saturno']),
    ascendantSign:transits.ascendant || undefined, ascendantDegree:Number.isFinite(Number(chart.ascendant))?Number(chart.ascendant):undefined,
  };
  const highlights=selectHighlights(transits.transit_relation);
  const situation=buildSituation(category,highlights,natal);
  return {
    generatedAt:new Date().toISOString(), transitDate:String(transits.transit_date||new Date().toISOString().slice(0,10)),
    birth:{ date:input.birthDate, time:birth.timeKnown?input.birthTime:'horário não informado', place:birth.place, resolvedPlace:location.resolvedPlace, timeKnown:birth.timeKnown },
    natal, current:{ ascendant:transits.ascendant||undefined, highlights }, situation,
    cardsBridge:buildCardsBridge(cards,highlights), solution:buildSolution(cards,highlights),
    reflection:`Se o céu descreve o clima e as cartas descrevem sua posição dentro dele, qual escolha de hoje preserva mais a sua autonomia?`,
    precisionNote:birth.timeKnown ? 'Cálculo realizado com data, horário, local e fuso histórico informados.' : 'Como o horário de nascimento não foi informado, usamos 12:00 como referência técnica. Sol e trânsitos continuam úteis, mas Ascendente e casas não devem ser tratados como precisos.',
  };
}
