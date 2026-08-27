import type { Reading } from './reading';
import type { TarotCard } from './tarot';

type PdfPage = { title?: string; lines: string[] };

const safe = (value: string) => value.replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\u0020-\u00ff]/g, '?');
const escapePdf = (value: string) => safe(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function wrap(text: string, width = 82) {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) { if (line) lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function latinBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

export function createReadingPdf(order: { order_number:string; customer_name:string; category:string; question:string; created_at:string }, cards: TarotCard[], reading: Reading) {
  const pages: PdfPage[] = [];
  pages.push({ lines: [
    'CHAMA SOFIA', '', 'SUA LEITURA DE TAROT', '',
    new Date(order.created_at).toLocaleDateString('pt-BR'), '',
    `Pedido ${order.order_number}`, '', 'Uma ferramenta simbólica de reflexão e autoconhecimento.',
  ] });
  const content: string[] = [
    'SUA PERGUNTA', ...wrap(order.question), '', `Tema: ${order.category}`, '',
    'SUAS TRÊS CARTAS', '',
  ];
  reading.cardReadings.forEach((item, index) => {
    content.push(`${index + 1}. ${cards[index].name} - ${item.position}`);
    content.push(...wrap(item.text), '');
  });
  content.push('COMO AS CARTAS CONVERSAM ENTRE SI', ...wrap(reading.connections), '', 'SÍNTESE DA LEITURA', ...wrap(reading.summary), '', 'REFLEXÃO FINAL', ...wrap(reading.reflection), '');
  const disclaimer = 'Esta leitura utiliza o Tarot como ferramenta simbólica de reflexão e autoconhecimento. Seu conteúdo não representa garantia de acontecimentos futuros e não substitui orientação médica, psicológica, jurídica, financeira ou profissional.';
  content.push('AVISO', ...wrap(disclaimer));
  while (content.length) pages.push({ lines: content.splice(0, 39) });

  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  pages.forEach((page, pageIndex) => {
    const commands: string[] = ['q', '0.08 0.03 0.12 rg', '0 0 595 842 re f', '0.84 0.66 0.32 RG', '1.2 w', '28 28 539 786 re S'];
    if (pageIndex === 0) {
      commands.push('BT', `/F2 12 Tf`, '0.84 0.66 0.32 rg', '210 730 Td', `(${escapePdf(page.lines[0])}) Tj`, 'ET');
      commands.push('BT', '/F2 30 Tf', '0.98 0.91 0.78 rg', '110 590 Td', `(${escapePdf(page.lines[2])}) Tj`, 'ET');
      commands.push('BT', '/F1 12 Tf', '0.85 0.78 0.86 rg', '170 520 Td');
      page.lines.slice(4).forEach((line, i) => commands.push(i ? '0 -25 Td' : '', `(${escapePdf(line)}) Tj`));
      commands.push('ET');
      commands.push('0.84 0.66 0.32 RG', '150 220 295 170 re S', '210 255 m 297 360 l 384 255 l S', '245 280 104 60 re S');
    } else {
      commands.push('BT', '/F2 11 Tf', '0.84 0.66 0.32 rg', '46 790 Td', '(CHAMA SOFIA  -  SUA LEITURA DE TAROT) Tj', 'ET');
      let y = 754;
      page.lines.forEach((line) => {
        const heading = /^[A-ZÁÉÍÓÚÇÃÕÊÔ\s]{4,}$/.test(line) || /^\d\./.test(line);
        commands.push('BT', heading ? '/F2 11 Tf' : '/F1 10 Tf', heading ? '0.91 0.74 0.40 rg' : '0.94 0.89 0.82 rg', `46 ${y} Td`, `(${escapePdf(line)}) Tj`, 'ET');
        y -= line ? (heading ? 22 : 16) : 9;
      });
    }
    commands.push('BT', '/F1 8 Tf', '0.62 0.55 0.65 rg', '46 45 Td', `(Chama Sofia  |  tarot.chamasofia.com.br  |  ${pageIndex + 1}/${pages.length}) Tj`, 'ET', 'Q');
    const stream = commands.filter(Boolean).join('\n');
    contentIds.push(add(`<< /Length ${latinBytes(stream).length} >>\nstream\n${stream}\nendstream`));
    pageIds.push(0);
  });
  const pagesId = objects.length + pages.length + 1;
  pages.forEach((_, index) => { pageIds[index] = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`); });
  add(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(latinBytes(pdf).length); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = latinBytes(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return latinBytes(pdf);
}
