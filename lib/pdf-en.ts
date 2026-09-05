import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { Reading } from './reading';
import type { TarotCard } from './tarot';
import type { AstroTarotLayer } from './astrology-types';
import { englishCardCopy } from './reading-en';

type PdfOrder = { order_number:string; customer_name:string; category:string; question:string; created_at:string };
const PAGE:[number,number]=[595.28,841.89];
const C={ink:rgb(.035,.018,.055),panel:rgb(.085,.042,.115),panel2:rgb(.12,.058,.145),gold:rgb(.84,.69,.37),goldSoft:rgb(.94,.82,.55),cream:rgb(.97,.92,.84),muted:rgb(.72,.65,.74)};
const CATEGORY_EN:Record<string,string>={"Amor e relacionamentos":"Love & attraction","Dinheiro":"Money & growth","Trabalho e carreira":"Career & ambition","Decisões":"Decision & direction"};

function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=text.replace(/\s+/g,' ').trim().split(' ');const lines:string[]=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(line&&font.widthOfTextAtSize(next,size)>maxWidth){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines}
function textBlock(page:PDFPage,text:string,x:number,y:number,width:number,font:PDFFont,size:number,color=C.cream,lineHeight=size*1.48){const lines=wrap(text,font,size,width);lines.forEach((line,i)=>page.drawText(line,{x,y:y-i*lineHeight,font,size,color}));return y-lines.length*lineHeight}
function panel(page:PDFPage,x:number,y:number,width:number,height:number,fill=C.panel){page.drawRectangle({x,y,width,height,color:fill,borderColor:rgb(.25,.18,.28),borderWidth:.8});page.drawRectangle({x:x+1.5,y:y+1.5,width:width-3,height:height-3,borderColor:rgb(.42,.33,.26),borderWidth:.35})}
function background(page:PDFPage){const [w,h]=PAGE;page.drawRectangle({x:0,y:0,width:w,height:h,color:C.ink});page.drawCircle({x:w*.84,y:h*.88,size:145,color:rgb(.11,.045,.14),opacity:.72});page.drawCircle({x:w*.14,y:h*.16,size:110,color:rgb(.16,.05,.12),opacity:.52});page.drawLine({start:{x:32,y:31},end:{x:w-32,y:31},thickness:.5,color:C.gold,opacity:.45})}
function header(page:PDFPage,bold:PDFFont,logo?:PDFImage){if(logo)page.drawImage(logo,{x:40,y:773,width:34,height:34});page.drawText('CHAMA SOFIA  ·  ASTROLOGY + TAROT',{x:logo?84:40,y:787,font:bold,size:8.5,color:C.goldSoft});page.drawText('PRIVATE READING',{x:462,y:787,font:bold,size:6.5,color:C.muted})}
function footer(page:PDFPage,regular:PDFFont,pageNumber:number,total:number){page.drawText('tarot.chamasofia.com.br/en',{x:40,y:17,font:regular,size:7,color:C.muted});page.drawText(`Operated by Proxima Digital · Brazil  ·  ${pageNumber}/${total}`,{x:332,y:17,font:regular,size:6.5,color:C.muted})}

export async function createReadingPdfEn(order:PdfOrder,cards:TarotCard[],reading:Reading,brandLogoBytes?:Uint8Array,astrology?:AstroTarotLayer|null){
  const pdf=await PDFDocument.create();pdf.setTitle(`Chama Sofia Reading · ${order.order_number}`);pdf.setAuthor('Chama Sofia');pdf.setSubject('Personalized astrology and Tarot reading for reflection and self-knowledge');
  const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
  let logo:PDFImage|undefined;if(brandLogoBytes?.length){try{logo=await pdf.embedPng(brandLogoBytes)}catch{logo=undefined}}
  const cover=pdf.addPage(PAGE);background(cover);if(logo)cover.drawImage(logo,{x:242,y:657,width:111,height:111});
  cover.drawText('CHAMA SOFIA',{x:229,y:632,font:bold,size:10,color:C.goldSoft});cover.drawText('YOUR PRIVATE',{x:138,y:555,font:bold,size:35,color:C.cream});cover.drawText('ASTRO + TAROT',{x:144,y:514,font:bold,size:35,color:C.goldSoft});
  cover.drawText('Your question, three cards and your birth sky brought together in one reading.',{x:105,y:475,font:regular,size:10,color:C.muted});panel(cover,70,310,455,118,rgb(.075,.034,.095));
  cover.drawText('YOUR QUESTION',{x:92,y:398,font:bold,size:7.5,color:C.gold});textBlock(cover,`“${order.question}”`,92,374,410,italic,14,C.cream,20);
  const category=CATEGORY_EN[order.category]||order.category;cover.drawText(`${category}  ·  ${new Date(order.created_at).toLocaleDateString('en-US')}`,{x:92,y:331,font:regular,size:8,color:C.muted});
  cover.drawText(`ORDER ${order.order_number}`,{x:232,y:268,font:bold,size:8,color:C.goldSoft});cover.drawText('Private · save it · return whenever you want',{x:190,y:245,font:regular,size:8,color:C.muted});

  const overview=pdf.addPage(PAGE);background(overview);header(overview,bold,logo);overview.drawText('Your three-card pattern',{x:40,y:735,font:bold,size:28,color:C.cream});overview.drawText('The reading becomes useful when the cards are read as one movement.',{x:40,y:710,font:regular,size:9,color:C.muted});
  const copyCards=cards.map((card)=>englishCardCopy(card.id));const positions=['CURRENT SITUATION','INFLUENCES','DIRECTION / ADVICE'];const cardW=159;
  cards.forEach((card,index)=>{const copy=copyCards[index];const x=40+index*178;panel(overview,x,455,cardW,190,C.panel2);overview.drawText(String(card.number).padStart(2,'0'),{x:x+15,y:606,font:bold,size:26,color:C.goldSoft});overview.drawText(positions[index],{x:x+15,y:585,font:bold,size:6.5,color:C.gold});overview.drawText(copy?.name||reading.cardReadings[index]?.cardName||card.name,{x:x+15,y:552,font:bold,size:13,color:C.cream});textBlock(overview,(copy?.keywords||[]).join(' · '),x+15,527,cardW-30,regular,8,C.muted,11);textBlock(overview,reading.cardReadings[index]?.text||'',x+15,495,cardW-30,regular,8.2,C.cream,12)});
  panel(overview,40,235,515,170,C.panel);overview.drawText('THE CORE MESSAGE',{x:57,y:378,font:bold,size:7.5,color:C.gold});textBlock(overview,reading.summary,57,350,478,regular,10.5,C.cream,16);
  panel(overview,40,95,515,105,rgb(.105,.045,.12));overview.drawText('REFLECTION',{x:57,y:172,font:bold,size:7.5,color:C.goldSoft});textBlock(overview,`“${reading.reflection}”`,57,147,478,italic,11.5,C.cream,17);

  reading.cardReadings.forEach((item,index)=>{const card=cards[index];const copy=copyCards[index];const page=pdf.addPage(PAGE);background(page);header(page,bold,logo);page.drawText(`0${index+1}`,{x:40,y:716,font:bold,size:54,color:C.goldSoft});page.drawText(item.position.toUpperCase(),{x:124,y:744,font:bold,size:7.5,color:C.gold});page.drawText(copy?.name||item.cardName,{x:124,y:704,font:bold,size:29,color:C.cream});page.drawText((copy?.keywords||[]).join('  ·  '),{x:124,y:680,font:regular,size:8.5,color:C.muted});
    panel(page,40,450,515,185,C.panel);page.drawText('YOUR INTERPRETATION',{x:58,y:607,font:bold,size:7.5,color:C.gold});textBlock(page,item.text,58,579,478,regular,11,C.cream,17);
    panel(page,40,292,247,120,rgb(.105,.045,.125));page.drawText('CONSTRUCTIVE POTENTIAL',{x:57,y:385,font:bold,size:7,color:C.goldSoft});textBlock(page,copy?.constructive||card.constructive,57,360,213,regular,9.3,C.cream,14);
    panel(page,308,292,247,120,rgb(.12,.035,.075));page.drawText('WATCH FOR',{x:325,y:385,font:bold,size:7,color:C.goldSoft});textBlock(page,copy?.alert||card.alert,325,360,213,regular,9.3,C.cream,14);
    panel(page,40,117,515,132,rgb(.07,.032,.09));page.drawText('HOW TO USE THIS CARD',{x:58,y:221,font:bold,size:7,color:C.gold});textBlock(page,`Instead of forcing a prediction, use ${copy?.name||item.cardName} to notice ${copy?.keywords?.[0]||'the first theme'}, work consciously with ${copy?.keywords?.[1]||'the influence in play'}, and choose one next step that protects your agency.`,58,195,478,regular,9.5,C.cream,14.5);
  });

  if(astrology){const astro=pdf.addPage(PAGE);background(astro);header(astro,bold,logo);astro.drawText('Your birth sky + current sky',{x:40,y:735,font:bold,size:28,color:C.cream});astro.drawText('Astrology adds context and timing to the three-card pattern.',{x:40,y:709,font:regular,size:9,color:C.muted});
    panel(astro,40,605,515,70,C.panel);astro.drawText('BIRTH DATA',{x:57,y:650,font:bold,size:7,color:C.gold});textBlock(astro,`${astrology.birth.date} · ${astrology.birth.time} · ${astrology.birth.resolvedPlace}`,57,630,480,regular,9,C.cream,13);
    const natalItems=[['SUN',astrology.natal.sun?.sign],['MOON',astrology.natal.moon?.sign],['ASCENDANT',astrology.natal.ascendantSign]] as const;natalItems.forEach(([label,value],index)=>{panel(astro,40+index*178,515,159,62,C.panel2);astro.drawText(label,{x:54+index*178,y:554,font:bold,size:6.5,color:C.gold});astro.drawText(value||'—',{x:54+index*178,y:532,font:bold,size:15,color:C.cream})});
    panel(astro,40,330,515,150,C.panel);astro.drawText('CURRENT MOVEMENTS',{x:57,y:452,font:bold,size:7,color:C.gold});let y=428;astrology.current.highlights.slice(0,3).forEach((item)=>{astro.drawText(`${item.transitPlanet} · ${item.aspectType} · ${item.natalPlanet}`,{x:57,y,font:bold,size:8,color:C.goldSoft});y=textBlock(astro,item.meaning,57,y-15,478,regular,8.3,C.cream,12)-8});
    panel(astro,40,188,515,112,rgb(.105,.045,.12));astro.drawText('WHERE SKY MEETS TAROT',{x:57,y:274,font:bold,size:7,color:C.goldSoft});textBlock(astro,astrology.cardsBridge,57,250,478,regular,9,C.cream,13.5);
    panel(astro,40,72,515,86,rgb(.13,.05,.10));astro.drawText('PRACTICAL DIRECTION',{x:57,y:133,font:bold,size:7,color:C.goldSoft});textBlock(astro,astrology.solution.steps.map(step=>`${step.title}: ${step.text}`).join('  '),57,112,478,regular,7.8,C.cream,11);
  }

  const end=pdf.addPage(PAGE);background(end);header(end,bold,logo);end.drawText('The integrated message',{x:40,y:735,font:bold,size:29,color:C.cream});end.drawText('Use the reading as a reflective tool, not as a fixed prediction.',{x:40,y:708,font:regular,size:9,color:C.muted});
  panel(end,40,510,515,160,C.panel);end.drawText('HOW THE CARDS SPEAK TO EACH OTHER',{x:58,y:642,font:bold,size:7.5,color:C.gold});textBlock(end,reading.connections,58,614,478,regular,10.5,C.cream,16);
  panel(end,40,330,515,140,rgb(.105,.045,.12));end.drawText('YOUR PRACTICAL TAKEAWAY',{x:58,y:443,font:bold,size:7.5,color:C.goldSoft});textBlock(end,reading.summary,58,415,478,regular,10.5,C.cream,16);
  panel(end,40,155,515,135,rgb(.13,.05,.10));end.drawText('A QUESTION TO KEEP',{x:58,y:262,font:bold,size:7.5,color:C.goldSoft});textBlock(end,`“${reading.reflection}”`,58,232,478,italic,13,C.cream,20);
  end.drawText('Tarot and astrology are offered for reflection, entertainment and self-knowledge. They do not guarantee future events and do not replace medical, legal, financial or psychological advice.',{x:40,y:84,font:regular,size:6.4,color:C.muted,maxWidth:515,lineHeight:9});
  const pages=pdf.getPages();pages.forEach((page,index)=>footer(page,regular,index+1,pages.length));return pdf.save({useObjectStreams:false});
}
