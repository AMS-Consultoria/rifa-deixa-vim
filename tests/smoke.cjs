const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/import[^\n]*\n/,'');
new vm.Script('(async()=>{'+source+'})()');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
class El{
 constructor(){this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.value='';this.style={};this.classList={add(){},remove(){}};}
 addEventListener(k,fn){this.listeners[k]=fn}
 click(){return this.listeners.click?.({preventDefault(){}})}
 submit(){return this.listeners.submit?.({preventDefault(){}})}
 cancel(){return this.listeners.cancel?.({preventDefault(){}})}
 change(){return this.listeners.change?.({target:this})}
 showModal(){this.open=true}
 close(){this.open=false}
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 setAttribute(){}
 focus(){}
 remove(){}
}
const elements=Object.fromEntries(ids.map(id=>[id,new El()]));
const document={getElementById:id=>elements[id],createElement:()=>new El(),body:new El(),visibilityState:'visible',execCommand:()=>true};
const $=id=>elements[id];
let now=0,timers=[],nextTimer=1,rand=0,session=true,authorized=true,failSync=false,failLogout=false,confirmResult=true;
let numbers=Array.from({length:100},(_,i)=>({numero:i+1,situacao:i===0?'vendido':'disponivel',comprador:i===0?'Alice':null,telefone:null,pago:i===0,valor:5}));
let history=[],inserts=0,signIns=0,configSaves=0,configMissing=false;
let config={id:1,nome_entidade:'Deixa Vim',nome_campanha:'Campanha 01',nome_rifa:'Rifa Deixa Vim',descricao_premio:'Agasalho esportivo',quantidade_bilhetes:100,valor_bilhete:5,criterio_sorteio:'Sorteio após todos os números serem preenchidos',situacao:'em_andamento'};
let multiCampaigns=false,campaignList=[{id:'campaign-1',codigo:1,nome_campanha:'Campanha 01'}],campaignTwoConfig=null,campaignTwoNumbers=[];
function query(table){
 const filters={};
 const q={
  select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return Promise.resolve({data:history.slice(),error:null})},
  maybeSingle(){const row=filters.campanha_id==='campaign-2'?campaignTwoConfig:config;return Promise.resolve(table==='rifa_configuracoes' && configMissing ? {data:null,error:{code:'PGRST205'}} : {data:table==='rifa_configuracoes'?{...row}:authorized?{user_id:'admin'}:null,error:null})},
  insert(row){inserts++;history.push({...row,realizado_em:new Date().toISOString()});return Promise.resolve({error:null})},
  update(){return q},
  range(start,end){const source=filters.campanha_id==='campaign-2'?campaignTwoNumbers:numbers;return Promise.resolve({data:failSync?null:source.slice(start,end+1).map(x=>({...x})),error:failSync?new Error('offline'):null})}
 };return q;
}const supabase={
 auth:{
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getSession:async()=>({data:{session:session?{user:{id:'admin'}}:null},error:null}),
  getUser:async()=>({data:{user:session?{id:'admin'}:null},error:null}),
  signInWithPassword:async()=>{signIns++;session=true;return {error:null}},
  signOut:async()=>{if(failLogout)return {error:new Error('offline')};session=false;return {error:null}}
 },
 from:query,
 rpc(name,args){
   if(name==='rifa_listar_campanhas_publicas')return multiCampaigns?{data:[{id:'campaign-1',codigo:1,nome_campanha:config.nome_campanha},...campaignList.filter(c=>c.id==='campaign-2')],error:null}:{data:null,error:{code:'PGRST202'}};
   if(name==='rifa_criar_campanha'){
    const id='campaign-2';
    campaignTwoConfig={id:2,campanha_id:id,nome_entidade:args.p_nome_entidade,nome_campanha:args.p_nome_campanha,nome_rifa:args.p_nome_rifa,descricao_premio:args.p_descricao_premio,quantidade_bilhetes:args.p_quantidade_bilhetes,valor_bilhete:args.p_valor_bilhete,criterio_sorteio:args.p_criterio_sorteio,situacao:args.p_situacao};
    campaignTwoNumbers=Array.from({length:args.p_quantidade_bilhetes},(_,i)=>({numero:i+1,situacao:'disponivel',comprador:null,telefone:null,pago:false,valor:args.p_valor_bilhete}));
    if(!campaignList.some(c=>c.id===id))campaignList.push({id,codigo:2,nome_campanha:args.p_nome_campanha});
    return Promise.resolve({data:id,error:null});
   }
   if(name==='rifa_salvar_configuracoes_campanha'){configSaves++;config={...config,nome_entidade:args.p_nome_entidade,nome_campanha:args.p_nome_campanha,nome_rifa:args.p_nome_rifa,descricao_premio:args.p_descricao_premio,quantidade_bilhetes:args.p_quantidade_bilhetes,valor_bilhete:args.p_valor_bilhete,criterio_sorteio:args.p_criterio_sorteio,situacao:args.p_situacao};return Promise.resolve({error:null})}
   if(name==='rifa_salvar_configuracoes'){configSaves++;config={...config,nome_entidade:args.p_nome_entidade,nome_campanha:args.p_nome_campanha,nome_rifa:args.p_nome_rifa,descricao_premio:args.p_descricao_premio,quantidade_bilhetes:args.p_quantidade_bilhetes,valor_bilhete:args.p_valor_bilhete,criterio_sorteio:args.p_criterio_sorteio,situacao:args.p_situacao};return Promise.resolve({error:null})}
   return {order(){return this},range(start,end){return Promise.resolve({data:failSync?null:numbers.slice(start,end+1).map(({numero,situacao})=>({numero,situacao,total_recebido:numbers.filter(x=>x.situacao==='vendido').reduce((a,x)=>a+x.valor,0)})),error:failSync?new Error('offline'):null})}}
  }
};;
const clock={
 now:()=>now,
 setTimeout(fn,delay){const id=nextTimer++;timers.push({id,at:now+delay,fn});return id},
 clearTimeout(id){timers=timers.filter(t=>t.id!==id)},
 runUntil(target){while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>target)break;const t=timers.shift();now=t.at;t.fn()}now=target}
};
const alerts=[],context={document,localStorage:{getItem:()=>null},navigator:{clipboard:{writeText:async()=>{}}},createClient:()=>supabase,
 crypto:{getRandomValues:a=>{a[0]=rand;return a},randomUUID:()=>crypto.randomUUID()},Uint32Array,
 performance:{now:clock.now},setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,setInterval:()=>0,
 alert:x=>alerts.push(x),confirm:()=>confirmResult,URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},Blob:class{},Date,console};
async function flush(){for(let i=0;i<10;i++)await new Promise(setImmediate)}
(async()=>{
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 assert.equal($('grid').children.length,100);
 assert.equal($('drawButton').hidden,false);
 assert.equal($('settingsButton').hidden,false);
 $('settingsButton').click();assert.equal($('settingsPage').hidden,false);assert.equal($('settingsForm').hidden,true);$('editCampaignButton').click();assert.equal($('settingsForm').hidden,false);
 $('settingsQuantity').value='0';await $('settingsForm').submit();assert.equal(configSaves,0);
 numbers[99].situacao='vendido';numbers[99].comprador='Teste'; await $('reloadButton').click();await flush();
 $('settingsQuantity').value='90';await $('settingsForm').submit();assert.equal(configSaves,0);
 assert.match($('settingsMessage').textContent,/não pode ocultar/);
 numbers[99].situacao='disponivel';numbers[99].comprador=null; await $('reloadButton').click();await flush();
 $('settingsQuantity').value='100';$('settingsPrice').value='7.50';$('settingsRaffle').value='Rifa Atualizada';
 await $('settingsForm').submit();await flush();
 assert.equal(configSaves,1);assert.equal($('heroRaffle').textContent,'Rifa Atualizada');
 assert.equal($('heroPrice').textContent,'R$ 7,50 por número');
 assert.equal($('total').textContent,'R$ 5,00');
 $('settingsBack').click();assert.equal($('settingsHub').hidden,false);$('settingsCloseButton').click();assert.equal($('settingsPage').hidden,true);
 assert.equal($('historySection').hidden,false);
 assert.equal($('vendidos').textContent,1);
 $('drawButton').click();assert.equal($('drawChoiceDialog').open,true);
 await $('drawSold').click();await flush();
 assert.equal($('drawDialog').open,true);
 assert.equal($('drawSave').hidden,true);
 clock.runUntil(14999);assert.equal($('drawSave').hidden,true);
 clock.runUntil(15000);assert.equal($('drawSave').hidden,false);
 assert.match($('drawWinner').textContent,/Alice/);
 assert.match($('drawResult').textContent,/01/);
 await $('drawSave').click();await flush();
 assert.equal(inserts,1);assert.equal(history[0].ganhador,'Alice');
 assert.equal(history[0].modalidade,'vendidos');
 assert.match($('historyList').children[0].children[2].textContent,/Alice/);
 $('drawClose').click();assert.equal($('drawDialog').open,false);
 rand=1; $('drawButton').click();await $('drawAll').click();await flush();
 clock.runUntil(now+15000);
 assert.match($('drawResult').textContent,/NÃO VENDIDO/);
 assert.equal($('drawAgain').hidden,false);
 confirmResult=false;$('drawClose').click();assert.equal($('drawDialog').open,true);
 confirmResult=true;$('drawClose').click();assert.equal($('drawDialog').open,false);
 assert.equal(inserts,1);
 failLogout=true;await $('logoutButton').click();await flush();
 assert.equal($('drawButton').hidden,true);
 await $('reloadButton').click();await flush();
 assert.equal($('drawButton').hidden,true);
 assert.match($('notice').textContent,/Use Sair novamente/);
 failLogout=false;await $('logoutButton').click();await flush();
 assert.equal($('drawButton').hidden,true);
 assert.equal($('historyList').children.length,0);
 assert.equal($('entries').children.length,0);
 $('loginButton').click();$('email').value='admin@example.test';$('password').value='test';
 await $('authForm').submit();await flush();
 assert.equal(signIns,1);assert.equal($('drawButton').hidden,false);
 configMissing=true;await $('reloadButton').click();await flush();
 assert.equal($('settingsSave').disabled,true);assert.equal($('grid').children.length,100);
 configMissing=false;
 config.quantidade_bilhetes=1100;
 numbers.push(...Array.from({length:1000},(_,i)=>({numero:i+101,situacao:'disponivel',comprador:null,telefone:null,pago:false,valor:7.5})));
 await $('reloadButton').click();await flush();assert.equal($('grid').children.length,1100);
 config.quantidade_bilhetes=100;numbers.length=100;
 await $('reloadButton').click();await flush();
 failSync=true;await $('reloadButton').click();await flush();
 assert.equal($('drawButton').hidden,true);
 assert.equal($('historyList').children.length,0);
 assert.equal($('entries').children.length,0);
 assert.equal($('livres').textContent,'…');
 assert.match($('notice').textContent,/Falha na sincronização/);
 assert.match(html,/\.actions\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(html,/\.draw-options\{display:grid;grid-template-columns:repeat\(2/);
 failSync=false;multiCampaigns=true;await $('reloadButton').click();await flush();
 assert.equal($('campaignSelect').children.length,1);assert.equal($('campaignSelect').disabled,true);
 await $('newCampaignButton').click();assert.equal($('settingsForm').hidden,false);assert.equal($('settingsQuantity').value,100);
 assert.match($('settingsMessage').textContent,/começa sem bilhetes ocupados/);
 $('settingsPrize').value='Prêmio da campanha 02';await $('settingsForm').submit();await flush();
 assert.equal(campaignList.filter(c=>c.id==='campaign-2').length,1);assert.equal($('campaignSelect').value,'campaign-2');
 assert.equal($('heroRaffle').textContent,'Nova rifa');assert.equal($('vendidos').textContent,0);assert.equal($('grid').children.length,100);
 $('campaignSelect').value='campaign-1';await $('campaignSelect').change();await flush();
 assert.equal($('heroRaffle').textContent,'Rifa Atualizada');assert.equal($('vendidos').textContent,1);
 assert.match(html,/id="campaignSelect"/);assert.match(html,/id="settingsHub"/);
 const migration=fs.readFileSync('supabase/migrations/20261026_etapa2_multiplas_campanhas.sql','utf8');
 assert.match(migration,/rifa_criar_campanha/);assert.match(migration,/primary key \(campanha_id, numero\)/i);
 assert.match(migration,/rifa_estado_publico\(p_campanha_id uuid\)/);assert.match(migration,/rifa_numeros set campanha_id/);
 console.log('PASS: fluxo legado, painel de configurações, criação de campanha vazia, seleção isolada, preservação da Campanha 01, roleta, histórico, login e escopo SQL preparado');
})().catch(e=>{console.error(e);process.exitCode=1});
