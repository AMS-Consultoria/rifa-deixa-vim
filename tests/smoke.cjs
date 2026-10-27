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
let participantRows=[],participantCalls=[],participantSeq=0;const norm=x=>String(x||'').normalize('NFD').replaceAll(String.fromCharCode(769),'').replaceAll(String.fromCharCode(771),'').toLowerCase().trim().split(' ').filter(Boolean).join(' ');
let multiCampaigns=false,campaignList=[{id:'campaign-1',codigo:1,nome_campanha:'Campanha 01'}],campaignTwoConfig=null,campaignTwoNumbers=[];
function query(table){
 const filters={};
 const q={
  select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return Promise.resolve({data:history.slice(),error:null})},
  maybeSingle(){const row=filters.campanha_id==='campaign-2'?campaignTwoConfig:config;return Promise.resolve(table==='rifa_configuracoes' && configMissing ? {data:null,error:{code:'PGRST205'}} : {data:table==='rifa_configuracoes'?{...row}:authorized?{user_id:'admin'}:null,error:null})},
  insert(row){inserts++;history.push({...row,realizado_em:new Date().toISOString()});return Promise.resolve({error:null})},
  update(){return q},
  range(start,end){const source=table==='rifa_sorteios'?history.map(x=>({numero:x.numero})):filters.campanha_id==='campaign-2'?campaignTwoNumbers:numbers;return Promise.resolve({data:failSync?null:source.slice(start,end+1).map(x=>({...x})),error:failSync?new Error('offline'):null})}
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
   if(name==='rifa_reservar_numeros_lote'){
    const selected=args.p_numeros.map(n=>numbers[n-1]);
    if(selected.some(x=>!x||x.situacao!=='disponivel'||history.some(h=>h.numero===x.numero)))return {data:null,error:new Error('Número ocupado ou sorteado')};
    let row=args.p_participante_id?participantRows.find(x=>x.id===args.p_participante_id):null;
    if(args.p_participante_id&&!row)return {data:null,error:new Error('Participante inexistente')};
    if(!row){const found=participantRows.filter(x=>norm(x.nome_completo)===norm(args.p_nome));if(found.length&&!args.p_confirmar_homonimo)return {data:{status:'duplicado',candidatos:found},error:null};row={id:'participant-'+(++participantSeq),nome_completo:args.p_nome,telefone:args.p_telefone||null,criado_em:new Date().toISOString()};participantRows.push(row)}
    for(const x of selected)numbers[x.numero-1]={...x,situacao:args.p_situacao,comprador:row.nome_completo,telefone:row.telefone,pago:args.p_situacao==='vendido',valor:config.valor_bilhete,participante_id:row.id};
    return {data:{status:'salvo',participante_id:row.id,quantidade:selected.length},error:null};
   }
   if(name==='rifa_confirmar_pagamento_lote'||name==='rifa_liberar_reservas_lote'){
    const selected=args.p_numeros.map(n=>numbers[n-1]);const ids=new Set(selected.map(x=>x.participante_id));
    if(selected.some(x=>x.situacao!=='reservado'||x.pago)||ids.size!==1||selected.some(x=>history.some(h=>h.numero===x.numero)))return {data:null,error:new Error('Reserva inválida')};
    for(const x of selected)numbers[x.numero-1]=name==='rifa_confirmar_pagamento_lote'?{...x,situacao:'vendido',pago:true}:{...x,situacao:'disponivel',pago:false,comprador:null,telefone:null,participante_id:null};
    return {data:{status:'salvo',quantidade:selected.length},error:null};
   }
   if(name==='rifa_salvar_participacao'){participantCalls.push({...args});const key=norm(args.p_nome);let row=args.p_participante_id?participantRows.find(x=>x.id===args.p_participante_id):null;if(!row){const found=participantRows.filter(x=>norm(x.nome_completo)===key);if(found.length&&!args.p_confirmar_homonimo)return Promise.resolve({data:{status:'duplicado',candidatos:found},error:null});row={id:'participant-'+(++participantSeq),nome_completo:args.p_nome,telefone:args.p_telefone,criado_em:new Date().toISOString()};participantRows.push(row)}numbers[args.p_numero-1]={...numbers[args.p_numero-1],situacao:args.p_situacao,comprador:row.nome_completo,telefone:row.telefone,pago:args.p_situacao==='vendido',participante_id:row.id};return Promise.resolve({data:{status:'salvo',participante_id:row.id},error:null})}
   if(name==='rifa_resumo_financeiro_publico'){
    const rows=args.p_campanha_id==='campaign-2'?campaignTwoNumbers:numbers;
    const recebido=rows.filter(x=>x.pago).reduce((total,x)=>total+Number(x.valor||0),0);
    const pendente=rows.filter(x=>x.situacao==='reservado'&&!x.pago).reduce((total,x)=>total+Number(x.valor||0),0);
    return {data:[{total_recebido:recebido,total_a_receber:pendente,total_geral:recebido+pendente}],error:null};
   }
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
 assert.equal($('total').textContent,'R$\u00a05,00');assert.equal($('pendingTotal').textContent,'R$\u00a00,00');assert.equal($('grandTotal').textContent,'R$\u00a05,00');
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
 $('campaignSelect').value='campaign-1';await $('campaignSelect').change();await flush();
 $('grid').children[1].click();$('nome').value='João da Silva';$('telefone').value='(11) 90000-0000';$('status').value='reservado';await $('form').submit();await flush();
 assert.equal(participantRows.length,1);const participanteOriginal=participantRows[0].id;assert.equal(numbers[1].participante_id,participanteOriginal);
 assert.equal($('pendingTotal').textContent,'R$\u00a05,00');assert.equal($('grandTotal').textContent,'R$\u00a010,00');
 $('grid').children[2].click();$('nome').value='  JOAO   DA SILVA ';$('telefone').value='11900000000';$('status').value='vendido';await $('form').submit();await flush();
 assert.match($('participantMatchTitle').textContent,/já cadastrado/);assert.equal(participantRows.length,1);assert.equal($('participantMatches').children.length,1);
 $('participantMatches').children[0].children[0].click();await $('form').submit();await flush();assert.equal(numbers[2].participante_id,participanteOriginal);
 assert.equal($('entries').children.length,2);assert.ok($('entries').children.some(li=>/Nº 02, 03/.test(li.children[0].textContent)));
 $('grid').children[3].click();$('nome').value='Joao da Silva';$('telefone').value='11911112222';await $('form').submit();await flush();assert.equal(participantRows.length,1);confirmResult=false;await $('participantHomonym').click();await flush();assert.equal(participantRows.length,1);assert.equal(numbers[3].situacao,'disponivel');confirmResult=true;await $('participantHomonym').click();await flush();assert.equal(participantRows.length,2);assert.notEqual(numbers[3].participante_id,participanteOriginal);
 assert.equal(participantCalls.filter(x=>x.p_confirmar_homonimo).length,1);assert.match(html,/Últimos participantes/);
 // Lote: dois números para um participante; pagamentos individuais e conjuntos; liberação segura.
 $('grid').children[0].click();assert.equal($('editor').open,false);assert.match($('notice').textContent,/registrado em sorteio/);
 $('bulkAddButton').click();await flush();assert.equal($('bulkFinishButton').hidden,false);assert.equal($('grid').children[0].disabled,true);
 $('grid').children[4].click();$('grid').children[5].click();assert.equal($('bulkFinishButton').disabled,false);await $('bulkFinishButton').click();
 assert.equal($('bulkDialog').open,true);$('bulkNome').value='Carlos Souza';$('bulkTelefone').value='11988887777';await $('bulkForm').submit();await flush();
 const carlos=participantRows.find(x=>x.nome_completo==='Carlos Souza');assert.ok(carlos);assert.equal(numbers[4].participante_id,carlos.id);assert.equal(numbers[5].participante_id,carlos.id);assert.equal(numbers[4].situacao,'reservado');
 let linhaCarlos=$('entries').children.find(x=>x.children[0].textContent.includes('Carlos Souza'));assert.ok(linhaCarlos);
 await $('confirmPaymentButton').click();await flush();assert.equal($('paymentChoiceDialog').open,true);
 const pagarCarlos=$('paymentChoices').children.find(li=>li.children[0]?.textContent.includes('Carlos Souza'));assert.ok(pagarCarlos);pagarCarlos.children[0].click();await flush();assert.equal($('participantDetailDialog').open,true);
 let fichaChecks=$('participantDetailNumbers').children.filter(li=>li.check);assert.equal(fichaChecks.length,2);fichaChecks.find(li=>li.numero===5).check.checked=true;await $('detailPaySelected').click();await flush();
 assert.equal(numbers[4].situacao,'vendido');assert.equal(numbers[4].pago,true);assert.equal(numbers[5].situacao,'reservado');
 await $('detailAddNumbers').click();await flush();assert.equal($('participantDetailDialog').open,false);$('grid').children[6].click();$('grid').children[7].click();await $('bulkFinishButton').click();await flush();
 assert.equal(numbers[6].participante_id,carlos.id);assert.equal(numbers[7].participante_id,carlos.id);assert.equal(numbers[6].situacao,'reservado');
 fichaChecks=$('participantDetailNumbers').children.filter(li=>li.check);fichaChecks.find(li=>li.numero===6).check.checked=true;fichaChecks.find(li=>li.numero===7).check.checked=true;await $('detailPaySelected').click();await flush();
 assert.equal(numbers[5].situacao,'vendido');assert.equal(numbers[6].situacao,'vendido');assert.equal(numbers[7].situacao,'reservado');
 fichaChecks=$('participantDetailNumbers').children.filter(li=>li.check);fichaChecks.find(li=>li.numero===8).check.checked=true;await $('detailReleaseSelected').click();await flush();assert.equal(numbers[7].situacao,'disponivel');
 // A tentativa de usar nome duplicado mostra os cadastros e associa sem criar duplicata.
 $('bulkAddButton').click();await flush();$('grid').children[8].click();$('grid').children[9].click();await $('bulkFinishButton').click();
 $('bulkNome').value='Carlos Souza';await $('bulkForm').submit();await flush();assert.equal($('bulkMatchPanel').hidden,false);assert.equal(participantRows.filter(x=>x.id===carlos.id).length,1);
 $('bulkMatches').children[0].children[0].click();await flush();assert.equal(numbers[8].participante_id,carlos.id);assert.equal(numbers[9].participante_id,carlos.id);assert.equal(participantRows.length,3);
 $('reserveNumbersButton').click();await flush();$('grid').children[10].click();await $('bulkFinishButton').click();assert.equal($('bulkStatus').disabled,true);assert.equal($('bulkTitle').textContent,'Reservar números');$('bulkNome').value='Dora Teste';await $('bulkForm').submit();await flush();assert.equal(numbers[10].situacao,'reservado');assert.equal($('pendingTotal').textContent,'R$\u00a032,50');assert.equal($('grandTotal').textContent,'R$\u00a065,00');
 const anteriores=numbers.slice(20,26).map(x=>({...x}));
 for(let i=0;i<6;i++)numbers[20+i]={...numbers[20+i],situacao:'reservado',pago:false,comprador:'Participante Extra '+(i+1),participante_id:'extra-'+i,atualizado_em:new Date(2026,0,i+1).toISOString()};
 await $('reloadButton').click();await flush();assert.equal($('entries').children.length,5);
 assert.match($('entries').children[0].children[0].textContent,/Participante Extra 6/);
 $('showAllParticipants').click();assert.ok($('entries').children.length>5);
 $('showAllParticipants').click();assert.equal($('entries').children.length,5);
 anteriores.forEach((r,i)=>numbers[20+i]=r);await $('reloadButton').click();await flush();
 session=false;authorized=false;await $('reloadButton').click();await flush();
 assert.equal($('drawButton').hidden,true);assert.equal($('confirmPaymentButton').hidden,true);
 assert.equal($('total').textContent,'R$\u00a032,50');assert.equal($('pendingTotal').textContent,'R$\u00a032,50');assert.equal($('grandTotal').textContent,'R$\u00a065,00');
 assert.match(html,/class="actions main-actions"/);assert.match(html,/class="finance-summary"/);assert.match(html,/id="settingsHub"[\s\S]*id="backup"/);
 console.log('PASS: Etapas 1–6 — campanhas e configurações, sorteio/histórico/login, cadastro único, seleção de números em lote, participante existente, homônimo, pagamentos individual/conjunto, liberação e proteção de sorteados');
})().catch(e=>{console.error(e);process.exitCode=1});
