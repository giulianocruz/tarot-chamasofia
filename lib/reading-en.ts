import type { Category, TarotCard } from './tarot';

const CARD_EN: Record<string,{name:string;keywords:[string,string,string];constructive:string;alert:string;general:string}> = {
  louco:{name:'The Fool',keywords:['beginnings','freedom','trust'],constructive:'curiosity, courage and openness',alert:'impulsiveness or avoiding practical consequences',general:'A new path asks for curiosity without abandoning awareness.'},
  mago:{name:'The Magician',keywords:['initiative','skill','manifestation'],constructive:'focused action and resourcefulness',alert:'scattered effort or promises without follow-through',general:'You already have tools that can be organized into a deliberate move.'},
  sacerdotisa:{name:'The High Priestess',keywords:['intuition','silence','mystery'],constructive:'inner listening and subtle perception',alert:'passivity, secrecy or difficulty naming what you feel',general:'Part of the answer may need to mature before it can be forced.'},
  imperatriz:{name:'The Empress',keywords:['creation','care','abundance'],constructive:'creativity, affection and sustainable growth',alert:'overgiving, dependency or depleted energy',general:'Something needs nourishment, time and a fertile environment to grow.'},
  imperador:{name:'The Emperor',keywords:['structure','boundaries','leadership'],constructive:'responsibility, stability and clear decisions',alert:'rigidity or excessive control',general:'Clear limits and structure make the next step safer.'},
  hierofante:{name:'The Hierophant',keywords:['values','tradition','learning'],constructive:'mentorship, coherence and shared wisdom',alert:'conformity or following rules that no longer fit',general:'This situation touches your values, references and inherited beliefs.'},
  enamorados:{name:'The Lovers',keywords:['choice','connection','alignment'],constructive:'reciprocity and conscious choice',alert:'indecision, idealization or outsourcing a personal decision',general:'A choice reveals what is truly aligned with your heart and values.'},
  carro:{name:'The Chariot',keywords:['direction','movement','determination'],constructive:'focus, autonomy and forward motion',alert:'rushing or fighting for control',general:'Different forces can move together when they share a clear direction.'},
  justica:{name:'Justice',keywords:['balance','truth','consequence'],constructive:'discernment, honesty and fair agreements',alert:'harsh judgment or over-rationalizing emotion',general:'Facts, proportion and accountability matter more than wishful thinking.'},
  eremita:{name:'The Hermit',keywords:['reflection','wisdom','search'],constructive:'maturity, research and inner autonomy',alert:'isolation or delaying support for too long',general:'A step inward can illuminate the path ahead.'},
  roda:{name:'Wheel of Fortune',keywords:['cycle','change','opportunity'],constructive:'flexibility and good timing',alert:'depending on luck or resisting a changing cycle',general:'The situation is moving and may open a new configuration.'},
  forca:{name:'Strength',keywords:['courage','presence','self-mastery'],constructive:'resilience, patience and calm confidence',alert:'emotional repression or proving strength through conflict',general:'The most useful strength here is steady and gentle rather than aggressive.'},
  enforcado:{name:'The Hanged Man',keywords:['pause','surrender','perspective'],constructive:'new perspective and conscious release',alert:'stagnation or waiting without purpose',general:'A voluntary pause can reveal what urgency hides.'},
  morte:{name:'Death',keywords:['ending','transformation','renewal'],constructive:'release, clearing and conscious transition',alert:'clinging to what has already completed its role',general:'An old form may need to end so energy can move again.'},
  temperanca:{name:'Temperance',keywords:['integration','healing','rhythm'],constructive:'moderation, reconciliation and steady progress',alert:'avoiding necessary conversations or diluting your own needs',general:'The answer may emerge through patient integration of different forces.'},
  diabo:{name:'The Devil',keywords:['desire','attachment','shadow'],constructive:'vitality, honesty about desire and personal power',alert:'compulsion, dependency or fear-based agreements',general:'Strong desire asks you to notice the price of the attachment.'},
  torre:{name:'The Tower',keywords:['revelation','rupture','truth'],constructive:'liberation, clarity and honest rebuilding',alert:'reactivity, drama or defending unstable foundations',general:'A truth can shake fragile structures and clear space for something more honest.'},
  estrela:{name:'The Star',keywords:['hope','inspiration','authenticity'],constructive:'renewal, inspiration and generosity',alert:'idealized expectation without practical participation',general:'There is room to restore trust and move with greater authenticity.'},
  lua:{name:'The Moon',keywords:['sensitivity','unconscious','uncertainty'],constructive:'imagination, perception and emotional awareness',alert:'confusion, projection or anxiety-led decisions',general:'Feelings and inner images are strong; intuition must be separated from fear.'},
  sol:{name:'The Sun',keywords:['clarity','vitality','joy'],constructive:'confidence, truth and shared energy',alert:'overexposure, pride or ignoring nuance',general:'Clarity favors honest expression and recognition of what is simple.'},
  julgamento:{name:'Judgement',keywords:['calling','review','awakening'],constructive:'awareness, forgiveness and renewed decisions',alert:'guilt, self-punishment or repeating an old story',general:'The past can be reviewed with enough maturity to answer a new call.'},
  mundo:{name:'The World',keywords:['completion','integration','wholeness'],constructive:'achievement, belonging and a wider view',alert:'difficulty finishing or demanding perfection before celebrating',general:'A cycle is ready to integrate so you can occupy a fuller position.'},
};

const POSITIONS = [
  {title:'Current situation',description:'The main context surrounding your question.'},
  {title:'Influences',description:'Forces, obstacles or factors shaping the moment.'},
  {title:'Direction / advice',description:'A possible direction and a reflection for your next step.'},
] as const;
function categoryLens(category: Category) {
  if (category === 'Amor e relacionamentos') return 'In relationships, notice reciprocity, attraction, boundaries and the quality of presence.';
  if (category === 'Dinheiro') return 'With money, favor awareness, proportion and choices that strengthen your real options.';
  if (category === 'Trabalho e carreira') return 'In career matters, translate the symbol into priorities, visibility and practical next steps.';
  return 'For this decision, compare values, consequences and what is actually under your control.';
}

export function createReadingEn(question: string, category: Category, cards: TarotCard[]) {
  const lens = categoryLens(category);
  const cardReadings = cards.map((card,index) => {
    const copy = CARD_EN[card.id];
    return {
      cardId: card.id,
      cardName: copy?.name || card.name,
      position: POSITIONS[index].title,
      positionDescription: POSITIONS[index].description,
      text: `${copy?.general || ''} ${lens} In ${POSITIONS[index].title.toLowerCase()}, notice ${copy?.keywords.slice(0,2).join(' and ')} while keeping an eye on ${copy?.alert}.`,
    };
  });
  const a=CARD_EN[cards[0].id], b=CARD_EN[cards[1].id], c=CARD_EN[cards[2].id];
  const connections = `${a.name} opens the reading through ${a.keywords[0]}; ${b.name} adds ${b.keywords[0]} as an influence; and ${c.name} shifts attention toward ${c.keywords[1]}. Together, they suggest a sequence: see the situation clearly, understand the force at work, then choose a response that stays aligned with your values.`;
  const summary = `For your question, the reading points to ${a.keywords[0]} shaped by ${b.keywords[1]}. The direction represented by ${c.name} supports ${c.constructive}, as long as you stay aware of ${b.alert}.`;
  const reflection = `What changes when you allow ${a.keywords[0]}, recognize ${b.keywords[0]}, and choose one small act of ${c.keywords[1]} that depends on you?`;
  return {
    question, category, cardReadings, connections, summary, reflection,
    disclaimer:'This Tarot reading is offered as a symbolic tool for reflection and self-knowledge. It does not guarantee future events.',
  };
}

export function englishCardCopy(id: string) { return CARD_EN[id]; }
