'use strict';
/* Teste seguro do funil público: intercepta TODOS os POST/PUT/PATCH/DELETE.
 * NÃO cria Pix, pedidos, leads ou pagamentos em produção.
 * Requer Puppeteer e Chrome local; CHROME_PATH pode sobrescrever o navegador.
 */
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer');
const base='https://tarot.chamasofia.com.br';
const chrome=process.env.CHROME_PATH||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function clickByText(page,phrase){
  for(let attempt=0;attempt<30;attempt++){
    for(const button of await page.$$('button')){
      const text=await button.evaluate(el=>el.innerText||'').catch(()=>'');
      if(text.toLocaleLowerCase('pt-BR').includes(phrase.toLocaleLowerCase('pt-BR'))){
        try{await button.click();await delay(300);return;}catch{}
      }
    }
    await delay(250);
  }
  throw new Error('Botão ausente: '+phrase);
}

async function main(){
  const response=await fetch(base+'/api/pricing?offer=consulta',{signal:AbortSignal.timeout(12000)});
  assert.equal(response.status,200,'Preço da oferta consulta indisponível');
  const publicPrice=await response.json();
  assert.ok(Number.isInteger(publicPrice.cents)&&publicPrice.cents>0);
  const browser=await puppeteer.launch({
    executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage'],timeout:25000
  });
  const page=await browser.newPage();
  const writes=[],errors=[],priceRequests=[];
  try{
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const url=new URL(req.url());
      if(url.pathname==='/api/pricing')priceRequests.push(url.searchParams.get('offer'));
      if(!['GET','HEAD','OPTIONS'].includes(req.method())){
        writes.push({path:url.pathname,method:req.method()});
        if(url.pathname==='/api/events'){
          return req.respond({status:200,contentType:'application/json',body:'{"ok":true}'});
        }
        return req.respond({status:409,contentType:'application/json',body:'{"ok":false,"error":"SAFE_TEST_BLOCKED"}'});
      }
      return req.continue();
    });
    page.on('pageerror',error=>errors.push(error.message));
    const landing=await page.goto(base+'/consulta',{waitUntil:'domcontentloaded',timeout:23000});
    assert.equal(landing.status(),200);
    await page.waitForSelector('.ritual-primary',{visible:true,timeout:12000});
    await delay(1000);await page.click('.ritual-primary');await delay(500);
    await clickByText(page,'Amor');
    await page.waitForSelector('textarea',{visible:true,timeout:12000});
    await page.type('textarea','Como agir com mais clareza e respeito em uma relação?');
    await clickByText(page,'CONTINUAR');
    await clickByText(page,'Carta Única');
    await clickByText(page,'TOQUE PARA EMBARALHAR');
    await clickByText(page,'ABRIR O BARALHO');
    await page.waitForSelector('button[aria-label^="Carta fechada"]',{timeout:12000});
    await page.click('button[aria-label^="Carta fechada"]');
    await clickByText(page,'REVELAR MINHA CARTA');
    await delay(650);
    const preCheckout=await page.evaluate(()=>({
      text:document.body.innerText,
      preview:document.querySelector('.ritual-preview-message > p:not(.eyebrow)')?.textContent||'',
      overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-document.documentElement.clientWidth
    }));
    assert.match(preCheckout.text,/PAGAMENTO ÚNICO/);
    assert.match(preCheckout.text,/LIBERAR LEITURA/);
    assert.ok(!preCheckout.preview.includes('..'),'Pontuação duplicada na prévia');
    assert.ok(!preCheckout.preview.includes('conduz a síntese'),'Prévia repetitiva');
    assert.ok(preCheckout.overflow<=2,'Overflow mobile');
    const shown=(preCheckout.text.match(/PAGAMENTO ÚNICO\s+(R\$\s*\d+,\d{2})/)||[])[1];
    assert.ok(shown,'Preço ausente na tela');
    const normalize=s=>s.replace(/\s+/g,'');
    assert.equal(normalize(shown),normalize(publicPrice.formatted),'Preço da tela diverge da oferta consulta');
    assert.ok(priceRequests.includes('consulta'),'Frontend consultou uma oferta diferente');
    console.log('PASS navegação e prévia até a tela de pagamento');
    console.log('PASS preço consulta alinhado à API: '+shown);

    const orderCount=()=>writes.filter(x=>x.path==='/api/orders').length;
    const before=orderCount();
    await clickByText(page,'LIBERAR LEITURA');await delay(400);
    assert.equal(orderCount(),before,'Pedido criado com e-mail vazio');
    console.log('PASS e-mail vazio não inicia pedido');

    await page.type('input[type=email]','teste-pagamento@example.invalid');
    await clickByText(page,'LIBERAR LEITURA');
    for(let attempt=0;attempt<15&&orderCount()===before;attempt++)await delay(200);
    assert.ok(orderCount()>before,'Não houve tentativa de checkout com e-mail preenchido');
    const body=await page.evaluate(()=>document.body.innerText);
    assert.ok(!/PIX CONFIRMADO|PAGAMENTO APROVADO/i.test(body),'Página alegou pagamento confirmado no teste bloqueado');
    assert.equal(errors.length,0,'Erro JavaScript: '+errors.join(' | '));
    console.log('PASS pedido com e-mail válido foi interceptado — nenhuma cobrança enviada');
    console.log('PASS nenhuma confirmação de pagamento falsa; sem erros JavaScript');
    console.log('TAROT_PRECHECKOUT_SAFE=PASS');
  }finally{
    await page.close();
    await browser.close();
  }
}
main().catch(error=>{console.error('TAROT_PRECHECKOUT_SAFE=FAIL',error.message);process.exitCode=1;});
