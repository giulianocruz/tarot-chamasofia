import calculateAstrology from 'natalengine/astrology';
import type { Category, TarotCard } from './tarot';
import type { AstroPlanet, AstroTarotLayer, AstroTransitHighlight, BirthInput } from './astrology-types';
import { localizeAstrologyEn } from './astrology-en';

type EnginePosition = { sign?: { name?: string }; longitude?: number; degree?: string };
type EngineChart = {
  sun?: EnginePosition; moon?: EnginePosition; rising?: EnginePosition;
  planets?: Record<string, EnginePosition>;
};
type Place = { name:string; label:string; latitude:number; longitude:number; timezone:string; countryCode?:string };

const SIGN_PT:Record<string,string>={
  Aries:'Áries',Taurus:'Touro',Gemini:'Gêmeos',Cancer:'Câncer',Leo:'Leão',Virgo:'Virgem',
  Libra:'Libra',Scorpio:'Escorpião',Sagittarius:'Sagitário',Capricorn:'Capricórnio',Aquarius:'Aquário',Pisces:'Peixes',
};
const PLANETS=[
  ['Sun','sun'],['Moon','moon'],['Mercury','mercury'],['Venus','venus'],['Mars','mars'],
  ['Jupiter','jupiter'],['Saturn','saturn'],['Uranus','uranus'],['Neptune','neptune'],['Pluto','pluto'],
] as const;
const ASPECTS=[
  {name:'Conjunction',angle:0,orb:6,weight:6},{name:'Opposition',angle:180,orb:5,weight:5},
  {name:'Square',angle:90,orb:4,weight:5},{name:'Trine',angle:120,orb:4,weight:4},{name:'Sextile',angle:60,orb:3,weight:3},
] as const;
const PLANET_WEIGHT:Record<string,number>={ Pluto:10,Neptune:9,Uranus:9,Saturn:8,Jupiter:7,Mars:6,Venus:6,Mercury:5,Sun:5,Moon:4 };

function parseDate(value:string){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if(!m)return null;
  const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]); const d=new Date(Date.UTC(year,month-1,day));
  return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?{year,month,day}:null;
}
function parseTime(value:string){
  const m=/^(\d{2}):(\d{2})$/.exec(value); if(!m)return null;
  const hour=Number(m[1]),min=Number(m[2]); return hour<=23&&min<=59?{hour,min}:null;
}
export function validateBirthInput(input:BirthInput){
  const date=parseDate(input.birthDate); const currentYear=new Date().getUTCFullYear();
  if(!date||date.year<1900||date.year>currentYear)throw new Error('Informe uma data de nascimento válida.');
  const time=input.timeKnown?parseTime(input.birthTime):{hour:12,min:0};
  if(!time)throw new Error('Informe um horário de nascimento válido.');
  const place=String(input.birthPlace||'').trim().replace(/\s+/g,' ').slice(0,140);
  if(place.length<3)throw new Error('Informe cidade, estado e país de nascimento.');
  return {...date,...time,place,timeKnown:Boolean(input.timeKnown)};
}
function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
async function fetchJson<T>(url:string,timeout=10000):Promise<T>{
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'ChamaSofia/1.0'}});
    if(!response.ok)throw new Error('Serviço de localização indisponível.');
    return await response.json() as T;
  }finally{clearTimeout(timer);}
}
async function searchPlaces(query:string):Promise<Place[]>{
  const data=await fetchJson<{results?:Array<{name?:string;admin1?:string;country?:string;latitude?:number;longitude?:number;timezone?:string;country_code?:string}>}>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=pt&format=json`
  );
  return (data.results||[]).filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&x.timezone).map(x=>({
    name:String(x.name||''),label:[x.name,x.admin1,x.country].filter(Boolean).join(', '),
    latitude:Number(x.latitude),longitude:Number(x.longitude),timezone:String(x.timezone),countryCode:x.country_code,
  }));
}
async function resolveBirthLocation(place:string){
  const city=place.split(',')[0].trim(); const target=normalize(city);
  const countryHint=/\b(brasil|brazil|br)\b/i.test(normalize(place))?'BR':'';
  const queries=Array.from(new Set([place,city,city.normalize('NFD').replace(/[\u0300-\u036f]/g,'')]));
  const candidates:Place[]=[];
  for(const query of queries){ candidates.push(...await searchPlaces(query)); if(candidates.some(p=>normalize(p.name)===target&&(!countryHint||p.countryCode===countryHint)))break; }
  const match=candidates.find(p=>normalize(p.name)===target&&(!countryHint||p.countryCode===countryHint))||candidates.find(p=>!countryHint||p.countryCode===countryHint)||candidates[0];
  if(!match)throw new Error('Não encontramos essa cidade. Tente informar como “Cidade, Estado, Brasil”.');
  return match;
}
function wallClockMs(utcMs:number,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date(utcMs));
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||'00'; const hour=get('hour')==='24'?'00':get('hour');
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`);
}
function utcOffsetAt(date:string,time:string,timeZone:string){
  const target=Date.parse(`${date}T${time}:00Z`); if(Number.isNaN(target))throw new Error('Data ou horário inválido.');
  let utc=target; for(let i=0;i<3;i+=1)utc+=target-wallClockMs(utc,timeZone);
  return (target-utc)/3600000;
}
function position(chart:EngineChart,key:string){return key==='sun'?chart.sun:key==='moon'?chart.moon:chart.planets?.[key];}
function astroPlanet(chart:EngineChart,name:string,key:string,include=true):AstroPlanet|undefined{
  const raw=position(chart,key); const lon=Number(raw?.longitude); if(!raw||!Number.isFinite(lon))return undefined;
  return {name,sign:SIGN_PT[String(raw.sign?.name||'')]||String(raw.sign?.name||''),degree:((lon%30)+30)%30,retrograde:undefined,house:undefined};
}
function engineChart(date:string,hour:number,offset:number,lat:number,lon:number):EngineChart{
  return calculateAstrology(date,hour,offset,lat,lon) as EngineChart;
}
function angularDistance(a:number,b:number){const d=Math.abs(a-b)%360;return d>180?360-d:d;}
function currentHighlights(natal:EngineChart,transit:EngineChart){
  const hits:Array<AstroTransitHighlight&{score:number}>=[];
  for(const [transitName,transitKey] of PLANETS){
    const t=position(transit,transitKey); const tl=Number(t?.longitude); if(!Number.isFinite(tl))continue;
    for(const [natalName,natalKey] of PLANETS){
      const n=position(natal,natalKey); const nl=Number(n?.longitude); if(!Number.isFinite(nl))continue;
      const distance=angularDistance(tl,nl);
      for(const aspect of ASPECTS){
        const delta=Math.abs(distance-aspect.angle); if(delta>aspect.orb)continue;
        const item={transitPlanet:transitName,natalPlanet:natalName,aspectType:aspect.name,transitSign:SIGN_PT[String(t?.sign?.name||'')]||String(t?.sign?.name||''),retrograde:false,meaning:'',score:(PLANET_WEIGHT[transitName]||2)+aspect.weight+(aspect.orb-delta)};
        item.meaning=transitMeaning(item); hits.push(item); break;
      }
    }
  }
  return hits.sort((a,b)=>b.score-a.score).slice(0,5).map(({score,...item})=>item);
}
function transitMeaning(item:AstroTransitHighlight){
  const tension=['Square','Opposition'].includes(item.aspectType);
  return `${item.transitPlanet} em ${item.aspectType.toLowerCase()} com ${item.natalPlanet} ${tension?'pede ajuste consciente, limites e revisão de padrões':'favorece integração, percepção e movimento intencional'}.`;
}
function categoryFocus(category:Category){
  if(category==='Amor e relacionamentos')return 'vínculos, reciprocidade e limites afetivos';
  if(category==='Dinheiro')return 'recursos, segurança e decisões materiais';
  if(category==='Trabalho e carreira')return 'direção profissional, visibilidade e responsabilidade';
  return 'clareza, escolha e consequências do próximo passo';
}
function buildSituation(category:Category,highlights:AstroTransitHighlight[],natal:AstroTarotLayer['natal']){
  const main=highlights[0],identity=natal.sun?.sign?`Seu Sol em ${natal.sun.sign}`:'Seu mapa natal';
  return main?`${identity} encontra um céu que destaca ${main.transitPlanet} em ${main.aspectType.toLowerCase()} com ${main.natalPlanet}. Para ${categoryFocus(category)}, isso sugere observação ativa antes de acelerar uma resposta.`:`${identity} oferece a base da leitura. Para ${categoryFocus(category)}, separe impulso, expectativa e fatos antes de decidir.`;
}
function buildCardsBridge(cards:TarotCard[],highlights:AstroTransitHighlight[]){
  const transit=highlights[0],sky=transit?`${transit.transitPlanet}/${transit.aspectType}`:'o céu atual';
  const first=cards[0],second=cards[1]||first,third=cards[2]||second;
  if(!first)return `O céu atual (${sky}) oferece uma camada adicional de contexto para sua pergunta.`;
  if(cards.length===1)return `${first.name} concentra a mensagem da tiragem. Cruzada com ${sky}, ela convida a observar qual resposta sua combina melhor com este momento.`;
  return `${first.name} descreve o ponto de partida, ${second.name} mostra uma força relevante e ${third.name} aponta uma direção possível. Cruzadas com ${sky}, as cartas deixam de buscar uma previsão rígida e passam a orientar uma resposta consciente.`;
}
function buildSolution(cards:TarotCard[],highlights:AstroTransitHighlight[]):AstroTarotLayer['solution']{
  const first=cards[0],second=cards[1]||first,third=cards[2]||second,transit=highlights[0];
  if(!first)return {title:'Astro + Tarot · sua orientação prática',steps:[]};
  return {title:'Astro + Tarot · sua orientação prática',steps:[
    {title:'1. Nomeie o que é real',text:`Use ${first.name} para separar fatos de ansiedade. ${transit?.meaning||'Observe o cenário antes de responder automaticamente.'}`},
    {title:'2. Trabalhe a força em jogo',text:`${second.name} pede atenção a ${second.keywords.slice(0,2).join(' e ')}. Escolha um limite, conversa ou ajuste concreto sob seu controle.`},
    {title:'3. Faça um movimento testável',text:`${third.name} favorece ${third.constructive.toLowerCase()}. Prefira um próximo passo pequeno, reversível e coerente com seus valores.`},
  ]};
}
function chartForBirth(input:ReturnType<typeof validateBirthInput>,place:Place){
  const time=`${String(input.hour).padStart(2,'0')}:${String(input.min).padStart(2,'0')}`;
  const offset=utcOffsetAt(`${input.year}-${String(input.month).padStart(2,'0')}-${String(input.day).padStart(2,'0')}`,time,place.timezone);
  return {chart:engineChart(`${input.year}-${String(input.month).padStart(2,'0')}-${String(input.day).padStart(2,'0')}`,input.hour+input.min/60,offset,place.latitude,place.longitude),offset};
}
function chartNow(place:Place){
  const now=new Date(),date=now.toISOString().slice(0,10),hour=now.getUTCHours()+now.getUTCMinutes()/60;
  return {chart:engineChart(date,hour,0,place.latitude,place.longitude),date};
}
export async function createAstroTarotLayer(input:BirthInput,question:string,category:Category,cards:TarotCard[],locale='pt-BR'):Promise<AstroTarotLayer>{
  const birth=validateBirthInput(input),place=await resolveBirthLocation(birth.place),birthData=chartForBirth(birth,place),current=chartNow(place);
  const chart=birthData.chart,highlights=currentHighlights(chart,current.chart);
  const natal={
    sun:astroPlanet(chart,'Sun','sun'),moon:astroPlanet(chart,'Moon','moon'),mercury:astroPlanet(chart,'Mercury','mercury'),
    venus:astroPlanet(chart,'Venus','venus'),mars:astroPlanet(chart,'Mars','mars'),jupiter:astroPlanet(chart,'Jupiter','jupiter'),saturn:astroPlanet(chart,'Saturn','saturn'),
    ascendantSign:birth.timeKnown?(SIGN_PT[String(chart.rising?.sign?.name||'')]||String(chart.rising?.sign?.name||'')):undefined,
    ascendantDegree:birth.timeKnown&&Number.isFinite(Number(chart.rising?.longitude))?Number(chart.rising?.longitude)%30:undefined,
  };
  const layer:AstroTarotLayer={
    generatedAt:new Date().toISOString(),transitDate:current.date,
    birth:{date:input.birthDate,time:birth.timeKnown?input.birthTime:'horário não informado',place:birth.place,resolvedPlace:place.label,timeKnown:birth.timeKnown},
    natal,current:{ascendant:undefined,highlights},situation:buildSituation(category,highlights,natal),
    cardsBridge:buildCardsBridge(cards,highlights),solution:buildSolution(cards,highlights),
    reflection:'Se o céu descreve o clima e as cartas descrevem sua posição dentro dele, qual escolha de hoje preserva mais a sua autonomia?',
    precisionNote:birth.timeKnown
      ? 'Cálculo local com efemérides astronômicas, coordenadas do local e fuso histórico IANA. O Ascendente usa o horário informado; esta versão não atribui casas natais sem uma cúspide de casas explicitamente calculada.'
      : 'Como o horário de nascimento não foi informado, usamos 12:00 como referência apenas para posições planetárias. Ascendente e casas são omitidos para não fabricar precisão.',
  };
  return locale.toLowerCase().startsWith('en')?localizeAstrologyEn(layer,cards,category):layer;
}
export async function createFreeNatalPreview(input:BirthInput){
  const birth=validateBirthInput(input),place=await resolveBirthLocation(birth.place),{chart}=chartForBirth(birth,place);
  const natal={
    sun:astroPlanet(chart,'Sun','sun'),moon:astroPlanet(chart,'Moon','moon'),mercury:astroPlanet(chart,'Mercury','mercury'),
    venus:astroPlanet(chart,'Venus','venus'),mars:astroPlanet(chart,'Mars','mars'),
    ascendantSign:birth.timeKnown?(SIGN_PT[String(chart.rising?.sign?.name||'')]||String(chart.rising?.sign?.name||'')):undefined,
    ascendantDegree:birth.timeKnown&&Number.isFinite(Number(chart.rising?.longitude))?Number(chart.rising?.longitude)%30:undefined,
  };
  return {generatedAt:new Date().toISOString(),birth:{date:input.birthDate,time:birth.timeKnown?input.birthTime:'horário não informado',place:birth.place,resolvedPlace:place.label,timeKnown:birth.timeKnown},natal,
    precisionNote:birth.timeKnown?'Prévia calculada localmente com coordenadas do local e fuso histórico IANA.':'Sem horário de nascimento, Ascendente e casas não são exibidos como precisos.'};
}
