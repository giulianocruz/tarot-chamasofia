import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createFreeNatalPreview, validateBirthInput } from '@/lib/astrology';
import type { BirthInput } from '@/lib/astrology-types';
import { buildJourneySummary, signPt, type JourneyInterest } from '@/lib/jornada-sofia';
import { checkRateLimit } from '@/lib/database';
import { cleanText, sameOrigin, sha256 } from '@/lib/security';

const interests = new Set<JourneyInterest>(['amor', 'carreira', 'espiritualidade', 'autoconhecimento']);

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  if (!(await checkRateLimit(`jornada-pdf:${await sha256(ip)}`, 8, 60 * 60 * 1000))) {
    return Response.json({ error: 'Muitos PDFs gerados recentemente. Tente novamente mais tarde.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 120).toLowerCase();
  const interestRaw = cleanText(body.interest, 30) as JourneyInterest;
  const interest: JourneyInterest = interests.has(interestRaw) ? interestRaw : 'autoconhecimento';
  const input: BirthInput = {
    birthDate: cleanText(body.birthDate, 10),
    birthTime: cleanText(body.birthTime, 5),
    birthPlace: cleanText(body.birthPlace, 140),
    timeKnown: Boolean(body.timeKnown),
  };

  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: 'E-mail inválido.' }, { status: 400 });
  try { validateBirthInput(input); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Dados de nascimento inválidos.' }, { status: 400 }); }

  try {
    const preview = await createFreeNatalPreview(input);
    const summary = buildJourneySummary(preview, name.trim().split(/\s+/)[0] || '', interest);
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const serif = await pdf.embedFont(StandardFonts.TimesRoman);
    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const pageSize: [number, number] = [595.28, 841.89];
    const margin = 54;
    const bodyWidth = pageSize[0] - margin * 2;
    let page = pdf.addPage(pageSize);
    let y = 786;

    const drawLine = (text: string, size = 10.5, font = regular, color = rgb(.22, .18, .24), gap = 5) => {
      for (const line of wrapText(text, font, size, bodyWidth)) {
        if (y < 72) { page = pdf.addPage(pageSize); y = 786; }
        page.drawText(line, { x: margin, y, size, font, color });
        y -= size + gap;
      }
    };
    const spacer = (amount: number) => { y -= amount; };

    page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: rgb(.98, .965, .93) });
    page.drawText('JORNADA SOFIA', { x: margin, y, size: 10, font: bold, color: rgb(.42, .25, .34) });
    y -= 29;
    page.drawText('Seu Mapa Astral', { x: margin, y, size: 30, font: serifBold, color: rgb(.16, .11, .18) });
    y -= 22;
    page.drawText('Leitura gratuita resumida', { x: margin, y, size: 13, font: serif, color: rgb(.48, .38, .45) });
    y -= 28;
    drawLine(`${name || 'Sua jornada'} · ${preview.birth.resolvedPlace}`, 9.5, regular, rgb(.42, .37, .43));
    spacer(10);

    const placements: Array<[string, string]> = [
      ['Sol', preview.natal.sun ? `${signPt(preview.natal.sun.sign)}${Number.isFinite(preview.natal.sun.degree) ? ` · ${Number(preview.natal.sun.degree).toFixed(1)}°` : ''}` : 'Não calculado'],
      ['Lua', preview.natal.moon ? `${signPt(preview.natal.moon.sign)}${Number.isFinite(preview.natal.moon.degree) ? ` · ${Number(preview.natal.moon.degree).toFixed(1)}°` : ''}` : 'Não calculado'],
      ['Mercúrio', preview.natal.mercury ? signPt(preview.natal.mercury.sign) : 'Não calculado'],
      ['Vênus', preview.natal.venus ? signPt(preview.natal.venus.sign) : 'Não calculado'],
      ['Marte', preview.natal.mars ? signPt(preview.natal.mars.sign) : 'Não calculado'],
      ['Ascendente', preview.birth.timeKnown ? signPt(preview.natal.ascendantSign) : 'Horário necessário'],
    ];

    page.drawText('SEUS PRINCIPAIS PONTOS', { x: margin, y, size: 9, font: bold, color: rgb(.56, .40, .25) });
    y -= 20;
    placements.forEach(([label, value], index) => {
      const x = margin + (index % 2) * 245;
      const rowY = y - Math.floor(index / 2) * 38;
      page.drawText(label.toUpperCase(), { x, y: rowY, size: 7.5, font: bold, color: rgb(.55, .49, .55) });
      page.drawText(value, { x, y: rowY - 14, size: 12, font: serifBold, color: rgb(.17, .12, .19) });
    });
    y -= 128;

    page.drawText(summary.elementLabel, { x: margin, y, size: 18, font: serifBold, color: rgb(.28, .17, .25) });
    y -= 25;
    [summary.identity, summary.emotional, summary.expression, summary.attraction, summary.action, summary.synthesis].forEach((paragraph, index) => {
      drawLine(paragraph, index === 5 ? 10.5 : 10, index === 5 ? serifBold : regular, index === 5 ? rgb(.35, .20, .29) : rgb(.24, .20, .25), 4.5);
      spacer(9);
    });

    spacer(4);
    drawLine('Esta leitura usa astrologia como linguagem simbólica de reflexão. Ela não prevê acontecimentos de forma garantida e não substitui orientação profissional.', 8.5, regular, rgb(.47, .43, .47), 3.5);
    spacer(14);
    drawLine('Sua Jornada continua em jornada.chamasofia.com.br — aprofunde apenas os caminhos que fizerem sentido para você.', 9.5, bold, rgb(.42, .25, .34), 4);

    for (const pdfPage of pdf.getPages()) {
      const { width } = pdfPage.getSize();
      pdfPage.drawText('Jornada Sofia · Chama Sofia', { x: margin, y: 32, size: 7.5, font: regular, color: rgb(.55, .51, .56) });
      pdfPage.drawText('jornada.chamasofia.com.br', { x: width - margin - 118, y: 32, size: 7.5, font: regular, color: rgb(.55, .51, .56) });
    }

    const bytes = await pdf.save();
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="meu-mapa-astral-jornada-sofia.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('jornada free map PDF failed', error);
    return Response.json({ error: 'Não foi possível gerar seu PDF agora.' }, { status: 502 });
  }
}
