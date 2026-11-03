'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync(require('node:path').join(__dirname,'..','ops','proxy','quality-hotfix.js'),'utf8');
function apply(input){
  const paragraph={textContent:input};
  const context={
    window:{},
    document:{querySelector:sel=>sel==='.ritual-preview-message > p:not(.eyebrow)'?paragraph:null,querySelectorAll:()=>[],documentElement:{}},
    location:{pathname:'/consulta'},
    MutationObserver:class {observe(){}},
    fetch:()=>Promise.resolve({ok:true})
  };
  vm.runInNewContext(script,context,{timeout:1000});
  assert.equal(context.window.__csQualityHotfix,true);
  return paragraph.textContent;
}
const cases=[
 ['Força','Para sua pergunta, A Força abre um tema de coragem. A Força aprofunda a leitura por meio de presença, enquanto A Força conduz a síntese para resiliência, paciência e confiança serena.. O ponto central é agir sem ignorar repressão emocional ou provar força pelo confronto..','A Força traz o tema de coragem','resiliência, paciência e confiança serena'],
 ['Ouros','Para sua pergunta, Nove de Ouros abre um tema de maturidade. Nove de Ouros aprofunda a leitura por meio de limiar, enquanto Nove de Ouros conduz a síntese para nove de ouros favorece constância, segurança e construção prática.. O ponto central é agir sem ignorar nove de ouros alerta para apego, lentidão ou preocupação material excessiva..','Nove de Ouros traz o tema de maturidade','constância, segurança e construção prática'],
 ['Copas','Para sua pergunta, Ás de Copas abre um tema de início. Ás de Copas aprofunda a leitura por meio de potencial, enquanto Ás de Copas conduz a síntese para ás de copas favorece escuta emocional e reciprocidade.. O ponto central é agir sem ignorar ás de copas alerta para idealização, dependência ou excesso de expectativa..','Ás de Copas traz o tema de início','escuta emocional e reciprocidade']
];
for(const [name,input,expected,benefit] of cases){
 const out=apply(input);
 assert.ok(out.includes(expected),name+' theme');
 assert.ok(out.includes(benefit),name+' benefit');
 assert.ok(!out.includes('..'),name+' double period');
 assert.ok(!out.includes('conduz a síntese'),name+' repetitive template');
 assert.equal(out.split(name==='Força'?'A Força':name==='Ouros'?'Nove de Ouros':'Ás de Copas').length,2,name+' repeat');
 console.log('PASS',name,out);
}
const unchanged='Uma síntese concisa e simbólica.';
assert.equal(apply(unchanged),unchanged);
console.log('PASS unchanged');
const multi='Para sua pergunta, A Força abre um tema de coragem. Nove de Ouros aprofunda a leitura por meio de recursos, enquanto A Força conduz a síntese para reflexão.. O ponto central é agir sem ignorar limites..';
assert.ok(apply(multi).includes('Nove de Ouros'));
console.log('PASS multi-card-preserved');
console.log('PREVIEW_QUALITY=5/5');
