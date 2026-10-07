import type { AstroTarotLayer } from './astrology-types';
import type { Category, TarotCard } from './tarot';
import { englishCardCopy } from './reading-en';

function focus(category: Category) {
  if (category === 'Amor e relacionamentos') return 'relationships, attraction, reciprocity and emotional boundaries';
  if (category === 'Dinheiro') return 'resources, security, growth and material choices';
  if (category === 'Trabalho e carreira') return 'career direction, visibility, ambition and responsibility';
  return 'clarity, choice and the consequences of your next move';
}

function aspectMeaning(item: AstroTarotLayer['current']['highlights'][number]) {
  const tense = ['Square','Opposition'].includes(item.aspectType);
  const house = item.natalHouse ? ` in your ${item.natalHouse}${item.natalHouse===1?'st':item.natalHouse===2?'nd':item.natalHouse===3?'rd':'th'} house` : '';
  return `${item.transitPlanet} ${item.aspectType.toLowerCase()} ${item.natalPlanet}${house} ${tense ? 'asks for conscious adjustment, boundaries and a review of patterns' : 'supports integration, perspective and intentional movement'}.`;
}

export function localizeAstrologyEn(layer: AstroTarotLayer, cards: TarotCard[], category: Category): AstroTarotLayer {
  const highlights = layer.current.highlights.map((item) => ({ ...item, meaning: aspectMeaning(item) }));
  const main = highlights[0];
  const sun = layer.natal.sun?.sign ? `Your Sun in ${layer.natal.sun.sign}` : 'Your birth chart';
  const situation = main
    ? `${sun} meets a sky highlighting ${main.transitPlanet} ${main.aspectType.toLowerCase()} ${main.natalPlanet}. For ${focus(category)}, this favors active observation: notice what is being pressed before rushing toward an answer.`
    : `${sun} provides the foundation of this reading. For ${focus(category)}, separate impulse, expectation and facts before deciding.`;
  const copies = cards.map((card) => englishCardCopy(card.id));
  const c1 = copies[0]?.name || cards[0]?.name || 'the selected card';
  const c2 = copies[1]?.name || cards[1]?.name || c1;
  const c3 = copies[2]?.name || cards[2]?.name || c2;
  const cardsBridge = cards.length === 1
    ? `${c1} concentrates the reading into one symbolic message. The sky adds timing and context so the question becomes less “what will happen?” and more “what response fits this moment best?”`
    : `${c1} describes your starting point, ${c2} shows a relevant force, and ${c3} points toward a possible direction. The sky adds timing and context so the question becomes less “what will happen?” and more “what response fits this moment best?”`;
  const solution = {
    title: 'Astrology + Tarot · your practical direction',
    steps: [
      { title: '1. Name what is real', text: `Use ${c1} to separate facts from anxiety. ${highlights[0]?.meaning || 'Observe the situation before reacting automatically.'}` },
      { title: '2. Work with the force in play', text: `${c2} asks you to notice ${copies[1]?.keywords.slice(0,2).join(' and ') || copies[0]?.keywords.slice(0,2).join(' and ') || 'the strongest influence'}. Choose one boundary, conversation or adjustment that is actually under your control.` },
      { title: '3. Make one testable move', text: `${c3} supports ${copies[2]?.constructive || copies[0]?.constructive || 'a deliberate next step'}. Prefer something small, reversible and aligned with your values.` },
    ],
  };
  return {
    ...layer,
    birth: { ...layer.birth, time: layer.birth.timeKnown ? layer.birth.time : 'time not provided' },
    current: { ...layer.current, highlights },
    situation, cardsBridge, solution,
    reflection: 'If the sky describes the climate and the cards describe your position inside it, which choice today protects more of your autonomy?',
    precisionNote: layer.provider?.enrichment === 'prokerala'
      ? 'Calculated locally and enriched with natal houses and aspects from Prokerala Astrology API using the Placidus house system.'
      : layer.birth.timeKnown
        ? 'Calculated using the birth date, time, location and historical time zone you provided.'
        : 'Because no birth time was provided, 12:00 was used as a technical reference. Sun and transit context remain useful, but Ascendant and houses should not be treated as precise.',
  };
}
