import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { Reading } from './reading';
import type { TarotCard } from './tarot';
import type { AstroTarotLayer } from './astrology-types';

type PdfOrder = {
  order_number: string;
  customer_name: string;
  category: string;
  question: string;
  created_at: string;
};

const PAGE: [number, number] = [595.28, 841.89];
const C = {
  ink: rgb(0.035, 0.018, 0.055),
  panel: rgb(0.085, 0.042, 0.115),
  panel2: rgb(0.12, 0.058, 0.145),
  gold: rgb(0.84, 0.69, 0.37),
  goldSoft: rgb(0.94, 0.82, 0.55),
  cream: rgb(0.97, 0.92, 0.84),
  muted: rgb(0.72, 0.65, 0.74),
  wine: rgb(0.31, 0.08, 0.18),
  green: rgb(0.44, 0.70, 0.52),
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = text.replace(/\s+/g, ' ').trim().split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function textBlock(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = C.cream, lineHeight = size * 1.48) {
  const lines = wrap(text, font, size, width);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, font, size, color }));
  return y - lines.length * lineHeight;
}

function panel(page: PDFPage, x: number, y: number, width: number, height: number, fill = C.panel) {
  page.drawRectangle({ x, y, width, height, color: fill, borderColor: rgb(0.25, 0.18, 0.28), borderWidth: 0.8 });
  page.drawRectangle({ x: x + 1.5, y: y + 1.5, width: width - 3, height: height - 3, borderColor: rgb(0.42, 0.33, 0.26), borderWidth: 0.35 });
}

function background(page: PDFPage) {
  const [w, h] = PAGE;
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: C.ink });
  page.drawCircle({ x: w * 0.84, y: h * 0.88, size: 145, color: rgb(0.11, 0.045, 0.14), opacity: 0.72 });
  page.drawCircle({ x: w * 0.14, y: h * 0.16, size: 110, color: rgb(0.16, 0.05, 0.12), opacity: 0.52 });
  page.drawLine({ start: { x: 32, y: 31 }, end: { x: w - 32, y: 31 }, thickness: 0.5, color: C.gold, opacity: 0.45 });
}

function header(page: PDFPage, bold: PDFFont, logo?: PDFImage) {
  if (logo) page.drawImage(logo, { x: 40, y: 773, width: 34, height: 34 });
  page.drawText('CHAMA SOFIA  \u00b7  TAROT', { x: logo ? 84 : 40, y: 787, font: bold, size: 9, color: C.goldSoft });
  page.drawText('LEITURA PRIVADA', { x: 458, y: 787, font: bold, size: 7, color: C.muted });
}

function footer(page: PDFPage, regular: PDFFont, pageNumber: number, total: number) {
  page.drawText('tarot.chamasofia.com.br', { x: 40, y: 17, font: regular, size: 7, color: C.muted });
  page.drawText(`${pageNumber}/${total}`, { x: 530, y: 17, font: regular, size: 7, color: C.muted });
}

function insightPanel(page: PDFPage, label: string, card: TarotCard, description: string, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  panel(page, x, y, width, 92, C.panel2);
  page.drawText(label.toUpperCase(), { x: x + 14, y: y + 69, font: bold, size: 7, color: C.gold });
  textBlock(page, card.keywords.slice(0, 2).join(' \u00b7 '), x + 14, y + 51, width - 28, bold, 8.5, C.goldSoft, 11);
  textBlock(page, description, x + 14, y + 28, width - 28, regular, 6.6, C.muted, 9);
}

function cardTile(page: PDFPage, card: TarotCard, index: number, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  const positions = ['SITUA\u00c7\u00c3O ATUAL', 'INFLU\u00caNCIAS', 'TEND\u00caNCIA / CONSELHO'];
  panel(page, x, y, width, 150, C.panel2);
  page.drawText(String(card.number).padStart(2, '0'), { x: x + 15, y: y + 118, font: bold, size: 26, color: C.goldSoft });
  page.drawText(positions[index], { x: x + 15, y: y + 100, font: bold, size: 6.5, color: C.gold });
  page.drawText(card.name, { x: x + 15, y: y + 73, font: bold, size: 13, color: C.cream });
  const keyword = card.keywords.slice(0, 2).join(' \u00b7 ');
  textBlock(page, keyword, x + 15, y + 51, width - 30, regular, 8, C.muted, 11);
  page.drawLine({ start: { x: x + 15, y: y + 34 }, end: { x: x + width - 15, y: y + 34 }, thickness: 0.5, color: C.gold, opacity: 0.3 });
  page.drawText('CHAMA SOFIA', { x: x + 15, y: y + 17, font: bold, size: 6.5, color: C.goldSoft });
}

export async function createReadingPdf(order: PdfOrder, cards: TarotCard[], reading: Reading, brandLogoBytes?: Uint8Array, astrology?: AstroTarotLayer | null) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Leitura de Tarot \u00b7 ${order.order_number}`);
  pdf.setAuthor('Chama Sofia');
  pdf.setSubject('Leitura simb\u00f3lica de Tarot para reflex\u00e3o e autoconhecimento');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  let logo: PDFImage | undefined;
  if (brandLogoBytes?.length) {
    try { logo = await pdf.embedPng(brandLogoBytes); } catch { logo = undefined; }
  }

  const cover = pdf.addPage(PAGE);
  background(cover);
  if (logo) cover.drawImage(logo, { x: 242, y: 657, width: 111, height: 111 });
  cover.drawText('CHAMA SOFIA', { x: 229, y: 632, font: bold, size: 10, color: C.goldSoft });
  cover.drawText('SUA LEITURA', { x: 128, y: 555, font: bold, size: 35, color: C.cream });
  cover.drawText('DE TAROT', { x: 195, y: 514, font: bold, size: 35, color: C.goldSoft });
  cover.drawText('Uma leitura simb\u00f3lica criada a partir da sua pergunta e das tr\u00eas cartas escolhidas.', { x: 92, y: 475, font: regular, size: 10, color: C.muted });
  panel(cover, 70, 310, 455, 118, rgb(0.075, 0.034, 0.095));
  cover.drawText('SUA PERGUNTA', { x: 92, y: 398, font: bold, size: 7.5, color: C.gold });
  textBlock(cover, `"${order.question}"`, 92, 374, 410, italic, 14, C.cream, 20);
  cover.drawText(`${order.category}  \u00b7  ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, { x: 92, y: 331, font: regular, size: 8, color: C.muted });
  cover.drawText(`PEDIDO ${order.order_number}`, { x: 232, y: 268, font: bold, size: 8, color: C.goldSoft });
  cover.drawText('Privado \u00b7 para guardar \u00b7 sem previs\u00f5es absolutas', { x: 189, y: 245, font: regular, size: 8, color: C.muted });

  const map = pdf.addPage(PAGE);
  background(map); header(map, bold, logo);
  map.drawText('Seu mapa simb\u00f3lico', { x: 40, y: 735, font: bold, size: 28, color: C.cream });
  map.drawText('Uma vis\u00e3o r\u00e1pida antes de mergulhar carta por carta.', { x: 40, y: 710, font: regular, size: 9, color: C.muted });
  panel(map, 40, 610, 515, 72, C.panel);
  map.drawText('PERGUNTA CENTRAL', { x: 57, y: 660, font: bold, size: 7, color: C.gold });
  textBlock(map, order.question, 57, 639, 480, italic, 11, C.cream, 15);
  insightPanel(map, 'Agora', cards[0], cards[0].general, 40, 493, 159, regular, bold);
  insightPanel(map, 'Influência', cards[1], cards[1].alert, 218, 493, 159, regular, bold);
  insightPanel(map, 'Direção', cards[2], cards[2].constructive, 396, 493, 159, regular, bold);
  map.drawText('Sinais extraídos das próprias cartas escolhidas — não são pontuações nem medições objetivas.', { x: 57, y: 468, font: regular, size: 6.7, color: C.muted });
  const cardW = 159;
  cards.forEach((card, index) => cardTile(map, card, index, 40 + index * 178, 260, cardW, regular, bold));
  panel(map, 40, 100, 515, 124, rgb(0.09, 0.04, 0.11));
  map.drawText('PRIMEIRA S\u00cdNTESE', { x: 57, y: 196, font: bold, size: 7, color: C.gold });
  textBlock(map, reading.summary, 57, 173, 480, regular, 9.5, C.cream, 14.5);

  if (astrology) {
    const astro = pdf.addPage(PAGE);
    background(astro); header(astro, bold, logo);
    astro.drawText('Seu céu + suas cartas', { x:40, y:735, font:bold, size:28, color:C.cream });
    astro.drawText('Mapa Astral Express e trânsitos do momento integrados ao Tarot.', { x:40, y:709, font:regular, size:9, color:C.muted });
    panel(astro,40,605,515,70,C.panel);
    astro.drawText('NASCIMENTO', { x:57, y:650, font:bold, size:7, color:C.gold });
    textBlock(astro, `${astrology.birth.date} · ${astrology.birth.time} · ${astrology.birth.resolvedPlace}`, 57,630,480,regular,9,C.cream,13);
    const natalItems=[['SOL',astrology.natal.sun?.sign],['LUA',astrology.natal.moon?.sign],['ASCENDENTE',astrology.natal.ascendantSign]] as const;
    natalItems.forEach(([label,value],index)=>{ panel(astro,40+index*178,515,159,62,C.panel2); astro.drawText(label,{x:54+index*178,y:554,font:bold,size:6.5,color:C.gold}); astro.drawText(value||'—',{x:54+index*178,y:532,font:bold,size:15,color:C.cream}); });
    textBlock(astro, astrology.precisionNote, 40, 495, 515, regular, 6.7, C.muted, 9);
    panel(astro,40,330,515,150,C.panel); astro.drawText('O CÉU DO MOMENTO', {x:57,y:452,font:bold,size:7,color:C.gold});
    let y=428; astrology.current.highlights.slice(0,3).forEach((item)=>{ astro.drawText(`${item.transitPlanet} · ${item.aspectType} · ${item.natalPlanet}`,{x:57,y,font:bold,size:8,color:C.goldSoft}); y=textBlock(astro,item.meaning,57,y-15,478,regular,8.3,C.cream,12)-8; });
    panel(astro,40,188,515,112,rgb(0.105,0.045,0.12)); astro.drawText('ASTRO + TAROT', {x:57,y:274,font:bold,size:7,color:C.goldSoft});
    textBlock(astro,astrology.cardsBridge,57,250,478,regular,9,C.cream,13.5);
    panel(astro,40,72,515,86,rgb(0.13,0.05,0.10)); astro.drawText('ORIENTAÇÃO', {x:57,y:133,font:bold,size:7,color:C.goldSoft});
    textBlock(astro,astrology.solution.steps.map(step=>`${step.title}: ${step.text}`).join('  '),57,112,478,regular,7.8,C.cream,11);
  }

  reading.cardReadings.forEach((item, index) => {
    const card = cards[index];
    const page = pdf.addPage(PAGE);
    background(page); header(page, bold, logo);
    page.drawText(`0${index + 1}`, { x: 40, y: 716, font: bold, size: 54, color: C.goldSoft });
    page.drawText(item.position.toUpperCase(), { x: 124, y: 744, font: bold, size: 7.5, color: C.gold });
    page.drawText(card.name, { x: 124, y: 704, font: bold, size: 29, color: C.cream });
    page.drawText(card.keywords.join('  \u00b7  '), { x: 124, y: 680, font: regular, size: 8.5, color: C.muted });
    panel(page, 40, 455, 515, 180, C.panel);
    page.drawText('LEITURA DA CARTA', { x: 58, y: 607, font: bold, size: 7.5, color: C.gold });
    textBlock(page, item.text, 58, 579, 478, regular, 11, C.cream, 17);
    panel(page, 40, 292, 247, 125, rgb(0.105, 0.045, 0.125));
    page.drawText('POTENCIAL CONSTRUTIVO', { x: 57, y: 390, font: bold, size: 7, color: C.goldSoft });
    textBlock(page, card.constructive, 57, 365, 213, regular, 9.5, C.cream, 14);
    panel(page, 308, 292, 247, 125, rgb(0.12, 0.035, 0.075));
    page.drawText('PONTO DE ATEN\u00c7\u00c3O', { x: 325, y: 390, font: bold, size: 7, color: C.goldSoft });
    textBlock(page, card.alert, 325, 365, 213, regular, 9.5, C.cream, 14);
    panel(page, 40, 117, 515, 132, rgb(0.07, 0.032, 0.09));
    page.drawText('COMO USAR ESTA CARTA NA SUA PERGUNTA', { x: 58, y: 221, font: bold, size: 7, color: C.gold });
    textBlock(page, `Em vez de buscar uma resposta r\u00edgida, use ${card.name} para observar ${card.keywords[0]}, reconhecer ${card.keywords[1]} e testar um pr\u00f3ximo passo que preserve seus limites e sua autonomia.`, 58, 195, 478, regular, 9.5, C.cream, 14.5);
  });

  const synthesis = pdf.addPage(PAGE);
  background(synthesis); header(synthesis, bold, logo);
  synthesis.drawText('A leitura completa', { x: 40, y: 735, font: bold, size: 29, color: C.cream });
  synthesis.drawText('O valor aparece quando as cartas deixam de ser isoladas e passam a conversar entre si.', { x: 40, y: 708, font: regular, size: 9, color: C.muted });
  panel(synthesis, 40, 500, 515, 170, C.panel);
  synthesis.drawText('COMO AS CARTAS CONVERSAM', { x: 58, y: 642, font: bold, size: 7.5, color: C.gold });
  textBlock(synthesis, reading.connections, 58, 614, 478, regular, 10.5, C.cream, 16);
  panel(synthesis, 40, 325, 515, 135, rgb(0.105, 0.045, 0.12));
  synthesis.drawText('S\u00cdNTESE PARA A SUA PERGUNTA', { x: 58, y: 433, font: bold, size: 7.5, color: C.goldSoft });
  textBlock(synthesis, reading.summary, 58, 405, 478, regular, 10.5, C.cream, 16);
  panel(synthesis, 40, 147, 515, 138, rgb(0.13, 0.05, 0.10));
  synthesis.drawText('REFLEX\u00c3O FINAL', { x: 58, y: 257, font: bold, size: 7.5, color: C.goldSoft });
  textBlock(synthesis, `"${reading.reflection}"`, 58, 226, 478, italic, 13, C.cream, 20);
  synthesis.drawText('Use esta pergunta como um ponto de apoio, n\u00e3o como uma obriga\u00e7\u00e3o de chegar a uma resposta imediata.', { x: 58, y: 169, font: regular, size: 7.5, color: C.muted });
  synthesis.drawText('Esta leitura utiliza o Tarot como ferramenta simb\u00f3lica de reflex\u00e3o e autoconhecimento. N\u00e3o representa garantia de acontecimentos futuros e n\u00e3o substitui orienta\u00e7\u00e3o m\u00e9dica, psicol\u00f3gica, jur\u00eddica, financeira ou profissional.', { x: 40, y: 79, font: regular, size: 6.3, color: C.muted, maxWidth: 515, lineHeight: 9 });

  const pages = pdf.getPages();
  pages.forEach((page, index) => footer(page, regular, index + 1, pages.length));
  return pdf.save({ useObjectStreams: false });
}