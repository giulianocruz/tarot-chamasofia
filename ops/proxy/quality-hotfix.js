(function(){
  if(window.__csQualityHotfix)return; window.__csQualityHotfix=true;
  const libraryUrl='https://chamasofia.com.br/biblioteca/';
  const playBase='https://play.google.com/store/search?c=books&q=';
  const playTitles={
    'Pomba Gira':'Pomba Gira O Grande Livro das Falanges Femininas da Umbanda',
    'Exu — Guardiões':'Exu O Grande Livro dos Guardiões da Umbanda',
    'Exu – Guardiões':'Exu O Grande Livro dos Guardiões da Umbanda',
    'Preto Velho':'Preto Velho e suas Falanges',
    'Cartomancia & Tarot':'Tarot para Iniciantes'
  };
  function track(name,meta){try{fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:name,metadata:meta||{}}),keepalive:true})}catch(e){}}
  // Corrige apenas a prévia genérica de carta única antes do checkout.
  // Não altera o oráculo, a interpretação paga, os dados nem o preço.
  function improvePreview(){
    const paragraph=document.querySelector('.ritual-preview-message > p:not(.eyebrow)');
    if(!paragraph)return;
    const old=(paragraph.textContent||'').trim();
    const m=old.match(/^Para sua pergunta,\s*(.+?)\s+abre um tema de\s+(.+?)\.\s+(.+?)\s+aprofunda a leitura por meio de\s+(.+?),\s+enquanto\s+(.+?)\s+conduz a síntese para\s+(.+?)\.\.\s+O ponto central é agir sem ignorar\s+(.+?)\.\.$/i);
    let next=old.replace(/\.{2,}/g,'.');
    if(m&&m[1].toLocaleLowerCase('pt-BR')===m[3].toLocaleLowerCase('pt-BR')&&m[1].toLocaleLowerCase('pt-BR')===m[5].toLocaleLowerCase('pt-BR')){
      const card=m[1],theme=m[2];
      const drop=(value,prefix)=>value.toLocaleLowerCase('pt-BR').startsWith(prefix.toLocaleLowerCase('pt-BR'))?value.slice(prefix.length):value;
      const positive=drop(m[6],card+' favorece ');
      const caution=drop(m[7],card+' alerta para ');
      if(theme&&positive&&caution){
        next='Para sua pergunta, '+card+' traz o tema de '+theme+'. Como possibilidade, considere '+positive+'. Como ponto de atenção, reflita sobre '+caution+'.';
      }
    }
    if(next!==old)paragraph.textContent=next;
  }
  function enhance(){
    improvePreview();
    document.querySelectorAll('a.library-inline-link').forEach(a=>{a.href=libraryUrl;a.target='_blank';a.rel='noopener';});
    document.querySelectorAll('.ebook-offer-card').forEach(card=>{
      if(card.querySelector('.cs-play-link'))return;
      const h=card.querySelector('h4'); if(!h)return;
      const title=(h.textContent||'').trim(); const query=playTitles[title]||title;
      const a=document.createElement('a'); a.className='cs-play-link'; a.href=playBase+encodeURIComponent(query); a.target='_blank'; a.rel='noopener';
      a.textContent='Ver no Google Play Livros ↗'; a.style.cssText='margin-top:8px;color:#d9bd7d;font-size:9px;font-weight:800;text-decoration:none';
      a.addEventListener('click',()=>track('cta_click',{surface:'ebook_card',destination:'google_play_books',title:title}));
      (card.querySelector('.ebook-offer-copy')||card).appendChild(a);
    });
    const offer=document.querySelector('.consult-offer');
    if(offer&&!offer.querySelector('.cs-library-cta')){
      const box=document.createElement('section'); box.className='cs-library-cta';
      box.innerHTML='<small>ANTES DE DECIDIR</small><strong>Veja quanto conteúdo já existe na Chama Sofia</strong><p>A Biblioteca reúne e-books gratuitos e premium. Conheça o acervo, compare o valor do conteúdo e continue só se fizer sentido para você.</p><a href="'+libraryUrl+'" target="_blank" rel="noopener">ABRIR A BIBLIOTECA CHAMA SOFIA →</a>';
      box.querySelector('a').addEventListener('click',()=>track('cta_click',{surface:'checkout',destination:'chamasofia_library'}));
      offer.appendChild(box);
    }
  }
  enhance();
  const mo=new MutationObserver(()=>enhance());
  mo.observe(document.documentElement,{subtree:true,childList:true});
})();
