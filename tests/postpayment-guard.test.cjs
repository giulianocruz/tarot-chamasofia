'use strict';
/**
 * Chama Sofia/Tarot — contrato read-only de recuperação e acesso pós-pagamento.
 *
 * NUNCA cria pedido ou Pix. Os únicos endpoints consultados são GET de saúde,
 * catálogo público e identificadores deliberadamente inválidos. No browser,
 * todos os métodos HTTP de escrita são interceptados e bloqueados.
 *
 * node tests/postpayment-guard.test.cjs
 * Requer Puppeteer (não é necessário instalar no servidor de produção).
 */
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer');

const origin='https://tarot.chamasofia.com.br';
const missingToken='qa-invalid-postpayment-20261103-no-order';
const browserPath=process.env.CHROME_PATH||
  (process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined);

async function get(path) {
  const response=await fetch(origin+path,{
    method:'GET',redirect:'follow',signal:AbortSignal.timeout(15000),
    headers:{'user-agent':'ChamaSofia-Postpayment-Guard/1.0'},
  });
  return {response,body:await response.text()};
}

async function run(){
  const health=await get('/api/health');
  assert.equal(health.response.status,200,'Health do Tarot fora do ar');
  const healthData=JSON.parse(health.body);
  assert.equal(healthData.ok,true);
  assert.equal(healthData.database,'ok');
  assert.equal(healthData.ebook,'ok');
  console.log('PASS health API e infraestrutura básica');

  const pricing=await get('/api/pricing?offer=consulta');
  assert.equal(pricing.response.status,200);
  const price=JSON.parse(pricing.body);
  assert.ok(Number.isInteger(price.cents)&&price.cents>0);
  console.log('PASS consulta com preço positivo:',price.cents,'centavos');

  for(const route of ['/api/orders/','/api/leads/']){
    const result=await get(route+missingToken);
    assert.equal(result.response.status,404,'Identificador inexistente não foi rejeitado em '+route);
    assert.ok(!/stack trace|error at /i.test(result.body),'Erro interno exposto em '+route);
    console.log('PASS',route,'rejeita identificador inexistente com HTTP 404');
  }

  const catalog=await get('/api/books/status');
  assert.equal(catalog.response.status,200,'Catálogo público de e-books inacessível');
  const books=JSON.parse(catalog.body).books;
  assert.ok(Array.isArray(books),'Contrato do catálogo de livros inválido');
  for(const book of books){
    assert.equal(typeof book.slug,'string');
    assert.equal(typeof book.available,'boolean');
    assert.ok(Number.isFinite(book.size)&&book.size>=0);
  }
  console.log('PASS catálogo público de e-books com contrato válido');
  const missing=books.filter(book=>!book.available).map(book=>book.slug);
  if(missing.length)console.warn('WARN e-books indisponíveis:',missing.join(', '));

  const browser=await puppeteer.launch({
    executablePath:browserPath,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage'],timeout:25000,
  });
  const page=await browser.newPage();
  const calls=[],errors=[],apiResponses=[];
  try {
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request',request=>{
      if(!['GET','HEAD','OPTIONS'].includes(request.method())){
        calls.push({method:request.method(),path:new URL(request.url()).pathname});
        return request.respond({status:409,contentType:'application/json',body:'{"ok":false,"error":"SAFE_TEST_BLOCKED"}'});
      }
      return request.continue();
    });
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{
      const url=new URL(response.url());
      if(url.hostname==='tarot.chamasofia.com.br'&&url.pathname.startsWith('/api/orders/')){
        apiResponses.push(response.status());
      }
    });
    const pageResponse=await page.goto(origin+'/leitura/'+missingToken,{
      waitUntil:'domcontentloaded',timeout:25000,
    });
    assert.equal(pageResponse.status(),200,'Página de leitura inacessível');
    await page.waitForFunction(
      ()=>document.body.innerText.includes('Não encontramos esta leitura'),
      {timeout:10000}
    );
    const view=await page.evaluate(()=>({
      message:document.body.innerText,
      robots:document.querySelector('meta[name=robots]')?.content||'',
      overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-document.documentElement.clientWidth,
    }));
    assert.match(view.message,/Não encontramos esta leitura/);
    assert.match(view.robots,/noindex/i,'Página inválida não protegida contra indexação');
    assert.doesNotMatch(view.message,/PIX CONFIRMADO|PAGAMENTO APROVADO/i);
    assert.ok(view.overflow<=2,'Estouro horizontal mobile');
    assert.ok(apiResponses.includes(404),'Frontend não consultou API de pedido inválido');
    assert.equal(errors.length,0,'Erro JavaScript inesperado: '+errors.join(' | '));
    assert.ok(!calls.some(call=>/\/api\/(orders|leads|payments|pix)/.test(call.path)),
      'Tentativa de escrita comercial indevida');
    console.log('PASS página móvel de leitura inexistente sem conteúdo pago nem mensagem de confirmação');
    console.log('PASS noindex, API 404, nenhuma escrita comercial e nenhum erro JavaScript');
  }finally{
    await page.close();
    await browser.close();
  }

  console.log('POSTPAYMENT_GUARD=PASS');
}

run().catch(error=>{
  console.error('POSTPAYMENT_GUARD=FAIL',error.message);
  process.exitCode=1;
});
