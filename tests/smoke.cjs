const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/import[^\n]*\n/,'')+"\nglobalThis.__setTestPaymentDetails=value=>{dadosPagamentoCampanha={...value};};";
new vm.Script('(async()=>{'+source+'})()');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
class El{
 constructor(){this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.value='';this.style={};this.files=[];this.classList={add(){},remove(){}};}
 getContext(){const canvas=this;canvas.rectCount=0;canvas.drawnText=[];canvas.drawnFonts=[];canvas.drawnPositions=[];canvas.rectangles=[];canvas.strokedRectangles=[];return {canvas,fillStyle:'',font:'',textAlign:'',textBaseline:'',createLinearGradient(){return {addColorStop(){}}},beginPath(){},arc(){},fill(){},closePath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(x,y,w,h){canvas.strokedRectangles.push({x,y,w,h})},drawImage(image){if(String(image?.src||'').startsWith('data:image/svg+xml'))this.canvas.backgroundDraws=(this.canvas.backgroundDraws||0)+1;else this.canvas.prizeDraws=(this.canvas.prizeDraws||0)+1},fillRect(x,y,w,h){canvas.rectCount++;canvas.rectangles.push({x,y,w,h})},fillText(x,xPos,yPos){canvas.drawnText.push(String(x));canvas.drawnFonts.push(this.font);canvas.drawnPositions.push({text:String(x),x:xPos,y:yPos,font:this.font,baseline:this.textBaseline})},measureText(x){return {width:String(x).length*9}}}}
 captureStream(){const track={stopped:false,stop(){this.stopped=true}};return {getTracks:()=>[track],getAudioTracks:()=>[],addTrack(){},track}}
 toBlob(fn,type){fn({type,width:this.width,height:this.height})}
 addEventListener(k,fn){this.listeners[k]=fn}
 click(){return this.listeners.click?.({preventDefault(){}})}
 submit(){return this.listeners.submit?.({preventDefault(){}})}
 cancel(){return this.listeners.cancel?.({preventDefault(){}})}
 change(){return this.listeners.change?.({target:this})}
 input(){return this.listeners.input?.({target:this})}
 showModal(){this.open=true}
 close(){this.open=false}
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 setAttribute(name,value){this[name]=String(value)}
 focus(){}
 remove(){}
}
const elements=Object.fromEntries(ids.map(id=>[id,new El()]));
const createdCanvases=[];const document={getElementById:id=>elements[id],createElement:tag=>{const e=new El();e.tagName=tag;if(tag==='canvas')createdCanvases.push(e);return e},body:new El(),visibilityState:'visible',execCommand:()=>true};
const $=id=>elements[id];
let now=0,timers=[],nextTimer=1,rand=0,session=true,authorized=true,failSync=false,failLogout=false,confirmResult=true;
let numbers=Array.from({length:100},(_,i)=>({numero:i+1,situacao:i===0?'vendido':'disponivel',comprador:i===0?'Alice':null,telefone:null,pago:i===0,valor:5}));
let history=[],inserts=0,signIns=0,configSaves=0,configMissing=false;
let config={id:1,nome_entidade:'Deixa Vim',nome_campanha:'Campanha 01',nome_rifa:'Rifa Deixa Vim',descricao_premio:'Agasalho esportivo',quantidade_bilhetes:100,valor_bilhete:5,criterio_sorteio:'Sorteio após todos os números serem preenchidos',situacao:'em_andamento'};
let participantRows=[],participantCalls=[],participantSeq=0,restoreCalls=[],downloads=[],shareCalls=0,shareFileCounts=[],shareFileNames=[],shareFileTypes=[],deletedCampaignCalls=[],clearedCampaignCalls=[];const storedPrizeImages=new Map();
let paymentDetails={tipo_chave_pix:'cpf_cnpj',chave_pix:'12345678901',whatsapp:'11987654321'};const norm=x=>String(x||'').normalize('NFD').replaceAll(String.fromCharCode(769),'').replaceAll(String.fromCharCode(771),'').toLowerCase().trim().split(' ').filter(Boolean).join(' ');
let multiCampaigns=false,campaignList=[{id:'campaign-1',codigo:1,nome_campanha:'Campanha 01'}],campaignTwoConfig=null,campaignTwoNumbers=[];
function query(table){
 const filters={};let columns='*';
 const q={
  select(c){columns=c||'*';return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return Promise.resolve({data:history.slice(),error:null})},
  maybeSingle(){const row=filters.campanha_id==='campaign-2'?campaignTwoConfig:config;return Promise.resolve(table==='rifa_configuracoes' && configMissing ? {data:null,error:{code:'PGRST205'}} : {data:table==='rifa_configuracoes'?{...row}:authorized?{user_id:'admin'}:null,error:null})},
  insert(row){inserts++;history.push({...row,realizado_em:new Date().toISOString()});return Promise.resolve({error:null})},
  update(){return q},
  range(start,end){const source=table==='rifa_sorteios'?(columns==='numero'?history.map(x=>({numero:x.numero})):history):filters.campanha_id==='campaign-2'?campaignTwoNumbers:numbers;return Promise.resolve({data:failSync?null:source.slice(start,end+1).map(x=>({...x})),error:failSync?new Error('offline'):null})}
 };return q;
}const supabase={
 auth:{
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getSession:async()=>({data:{session:session?{user:{id:'admin'}}:null},error:null}),
  getUser:async()=>({data:{user:session?{id:'admin'}:null},error:null}),
  signInWithPassword:async()=>{signIns++;session=true;return {error:null}},
  signOut:async()=>{if(failLogout)return {error:new Error('offline')};session=false;return {error:null}}
 },
 from:query,storage:{from(bucket){return {upload(path,file){storedPrizeImages.set(bucket+'/'+path,file);return Promise.resolve({data:{path},error:null})},createSignedUrl(path){return Promise.resolve(storedPrizeImages.has(bucket+'/'+path)?{data:{signedUrl:'https://storage.test/'+path},error:null}:{data:null,error:{statusCode:'404',message:'Object not found'}})},download(path){return Promise.resolve(storedPrizeImages.has(bucket+'/'+path)?{data:storedPrizeImages.get(bucket+'/'+path),error:null}:{data:null,error:{statusCode:'404',message:'Object not found'}})},remove(paths){for(const path of paths)storedPrizeImages.delete(bucket+'/'+path);return Promise.resolve({data:paths.map(name=>({name})),error:null})}}}},
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
   if(name==='rifa_editar_participante'){
    const row=participantRows.find(x=>x.id===args.p_participante_id);if(!row)return {data:null,error:new Error('Participante inexistente')};
    const vinculados=[...numbers,...campaignTwoNumbers].filter(x=>x.participante_id===row.id);
    if(vinculados.some(x=>x.pago||x.situacao==='vendido'||history.some(h=>h.numero===x.numero)))return {data:{status:'protegido'},error:null};
    const candidatos=participantRows.filter(x=>x.id!==row.id&&norm(x.nome_completo)===norm(args.p_nome));
    if(norm(row.nome_completo)!==norm(args.p_nome)&&candidatos.length&&!args.p_confirmar_homonimo)return {data:{status:'duplicado',candidatos},error:null};
    row.nome_completo=args.p_nome;row.telefone=args.p_telefone||null;
    for(const x of [...numbers,...campaignTwoNumbers])if(x.participante_id===row.id){x.comprador=row.nome_completo;x.telefone=row.telefone}
    return {data:{status:'salvo',participante_id:row.id},error:null};
   }
   if(name==='rifa_obter_dados_campanha_admin')return Promise.resolve({data:{...paymentDetails},error:null});
   if(name==='rifa_restaurar_backup_campanha'){restoreCalls.push({...args});return Promise.resolve({data:{registros_restaurados:1,registros_preservados:1,sorteios_restaurados:1,sorteios_duplicados:0},error:null})}
   if(name==='rifa_limpar_dados_campanha'){clearedCampaignCalls.push({...args});return Promise.resolve({data:{status:'limpo'},error:null})}
   if(name==='rifa_excluir_campanha'){deletedCampaignCalls.push({...args});campaignList=campaignList.filter(c=>c.id!==args.p_campanha_id);return Promise.resolve({data:{status:'excluida'},error:null})}
   if(name==='rifa_resumo_financeiro_publico'){
    const rows=args.p_campanha_id==='campaign-2'?campaignTwoNumbers:numbers;
    const recebido=rows.filter(x=>x.pago).reduce((total,x)=>total+Number(x.valor||0),0);
    const pendente=rows.filter(x=>x.situacao==='reservado'&&!x.pago).reduce((total,x)=>total+Number(x.valor||0),0);
    return {data:[{total_recebido:recebido,total_a_receber:pendente,total_geral:recebido+pendente}],error:null};
   }
   if(name==='rifa_listar_campanhas_publicas')return multiCampaigns?{data:[{id:'campaign-1',codigo:1,nome_campanha:config.nome_campanha},...campaignList.filter(c=>c.id==='campaign-2')],error:null}:{data:null,error:{code:'PGRST202'}};
   if(name==='rifa_criar_campanha_etapa9'){
    const id='campaign-2';
    paymentDetails={tipo_chave_pix:args.p_tipo_chave_pix,chave_pix:args.p_chave_pix,whatsapp:args.p_whatsapp};campaignTwoConfig={id:2,campanha_id:id,nome_entidade:args.p_nome_entidade,nome_campanha:args.p_nome_campanha,nome_rifa:args.p_nome_rifa,descricao_premio:args.p_descricao_premio,quantidade_bilhetes:args.p_quantidade_bilhetes,valor_bilhete:args.p_valor_bilhete,criterio_sorteio:args.p_criterio_sorteio,situacao:args.p_situacao};
    campaignTwoNumbers=Array.from({length:args.p_quantidade_bilhetes},(_,i)=>({numero:i+1,situacao:'disponivel',comprador:null,telefone:null,pago:false,valor:args.p_valor_bilhete}));
    if(!campaignList.some(c=>c.id===id))campaignList.push({id,codigo:2,nome_campanha:args.p_nome_campanha});
    return Promise.resolve({data:id,error:null});
   }
   if(name==='rifa_salvar_configuracoes_campanha_etapa9'){configSaves++;paymentDetails={tipo_chave_pix:args.p_tipo_chave_pix,chave_pix:args.p_chave_pix,whatsapp:args.p_whatsapp};config={...config,nome_entidade:args.p_nome_entidade,nome_campanha:args.p_nome_campanha,nome_rifa:args.p_nome_rifa,descricao_premio:args.p_descricao_premio,quantidade_bilhetes:args.p_quantidade_bilhetes,valor_bilhete:args.p_valor_bilhete,criterio_sorteio:args.p_criterio_sorteio,situacao:args.p_situacao};return Promise.resolve({error:null})}
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
const audioNodes=[],bufferSources=[];class FakeAudioParam{constructor(){this.value=0}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}cancelScheduledValues(){}}class FakeAudioNode{constructor(){this.gain=new FakeAudioParam();this.frequency=new FakeAudioParam();this.starts=0;audioNodes.push(this)}connect(){return this}disconnect(){}start(){this.starts++}stop(){}}class FakeAudioContext{constructor(){this.state='running';this.currentTime=0;this.destination=new FakeAudioNode()}createGain(){return new FakeAudioNode()}createOscillator(){return new FakeAudioNode()}createBufferSource(){const source=new FakeAudioNode();bufferSources.push(source);return source}decodeAudioData(){return Promise.resolve({duration:8})}createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{stop(){}}]}}}resume(){return Promise.resolve()}}
const alerts=[],windowListeners={},localStorageValues=new Map(),mediaRecorders=[];class FakeMediaRecorder{constructor(stream,options={}){this.stream=stream;this.mimeType=options.mimeType||'video/webm';this.state='inactive';this.listeners={};mediaRecorders.push(this)}static isTypeSupported(){return true}addEventListener(type,fn){this.listeners[type]=fn}start(){this.state='recording'}stop(){this.state='inactive';this.listeners.dataavailable?.({data:{size:12,type:this.mimeType}});this.listeners.stop?.()}}let pwaStandalone=false,pwaPromptCount=0;const fakeWindow={AudioContext:FakeAudioContext,MediaRecorder:FakeMediaRecorder,addEventListener(type,fn){windowListeners[type]=fn},matchMedia(){return {matches:pwaStandalone}},location:{href:'https://ams-consultoria.github.io/rifa-deixa-vim/',reload(){}}};const context={window:fakeWindow,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),Image:class{constructor(){this.width=1200;this.height=800;this.naturalWidth=1200;this.naturalHeight=800}set src(value){this._src=value;this.onload?.()}get src(){return this._src}},document,localStorage:{getItem:key=>localStorageValues.get(key)||null,setItem:(key,value)=>localStorageValues.set(key,value)},navigator:{clipboard:{writeText:async()=>{}},share:async args=>{shareCalls++;shareFileCounts.push(args.files?.length||0);shareFileNames.push((args.files||[]).map(file=>file.name));shareFileTypes.push((args.files||[]).map(file=>file.type))},canShare:()=>true},File:class{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type}},createClient:()=>supabase,
 crypto:{getRandomValues:a=>{a[0]=rand;return a},randomUUID:()=>crypto.randomUUID()},Uint32Array,
 performance:{now:clock.now},setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,setInterval:()=>0,
 alert:x=>alerts.push(x),confirm:()=>confirmResult,URL:{createObjectURL:blob=>{downloads.push(blob);return 'blob:test-'+downloads.length},revokeObjectURL:()=>{}},Blob:class{constructor(parts,options){this.parts=parts;this.type=options?.type}},Date,console};
async function flush(){for(let i=0;i<10;i++)await new Promise(setImmediate)}
(async()=>{
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 assert.equal($('grid').children.length,100);
 assert.equal($('drawButton').hidden,false);
 assert.equal($('drawSoundToggleChoice')['aria-pressed'],'true');$('drawSoundToggleChoice').click();assert.equal($('drawSoundToggleChoice')['aria-pressed'],'false');assert.equal(localStorageValues.get('rifa-som-sorteio'),'off');$('drawSoundToggleChoice').click();assert.equal($('drawSoundToggleChoice')['aria-pressed'],'true');assert.equal(localStorageValues.get('rifa-som-sorteio'),'on');
 assert.equal($('settingsButton').hidden,false);assert.equal($('statusReservedButton')['aria-pressed'],'true');assert.equal($('statusSoldButton')['aria-pressed'],'false');$('statusSoldButton').click();assert.equal($('status').value,'vendido');assert.equal($('statusSoldButton')['aria-pressed'],'true');assert.equal($('statusReservedButton')['aria-pressed'],'false');$('statusReservedButton').click();assert.equal($('status').value,'reservado');assert.equal($('statusReservedButton')['aria-pressed'],'true');
 $('settingsButton').click();assert.equal($('settingsPage').hidden,false);assert.equal($('settingsForm').hidden,true);$('editCampaignButton').click();assert.equal($('settingsForm').hidden,false);
 $('settingsQuantity').value='0';await $('settingsForm').submit();assert.equal(configSaves,0);
 numbers[99].situacao='vendido';numbers[99].comprador='Teste'; await $('reloadButton').click();await flush();
 $('settingsQuantity').value='90';await $('settingsForm').submit();assert.equal(configSaves,0);
 assert.match($('settingsMessage').textContent,/não pode ocultar/);
 numbers[99].situacao='disponivel';numbers[99].comprador=null; await $('reloadButton').click();await flush();
 $('settingsQuantity').value='100';$('settingsPrice').value='7.50';$('settingsRaffle').value='Rifa Atualizada';
 await $('settingsForm').submit();await flush();
 assert.equal(configSaves,1);assert.equal(paymentDetails.tipo_chave_pix,'cpf_cnpj');assert.equal(paymentDetails.chave_pix,'12345678901');assert.equal(paymentDetails.whatsapp,'11987654321');assert.equal($('heroRaffle').textContent,'Rifa Atualizada');
 assert.equal($('heroPrice').textContent,'R$ 7,50 por número');
 assert.equal($('total').textContent,'R$ 5,00');
 $('settingsBack').click();assert.equal($('settingsHub').hidden,false);$('settingsCloseButton').click();assert.equal($('settingsPage').hidden,true);
 $('settingsButton').click();
 for(const quantity of [100,120,150,200]){
  config.quantidade_bilhetes=quantity;config.criterio_sorteio=quantity===120?'Sorteio no dia 15 de novembro conforme regulamento':'Sorteio após todos os números serem vendidos';if(quantity===150)config.descricao_premio='Agasalho esportivo, cesta de alimentos, kit de higiene, cobertor, mochila escolar, material de limpeza e vale compras para a família participante';
  if(numbers.length<quantity)numbers.push(...Array.from({length:quantity-numbers.length},(_,i)=>({numero:numbers.length+i+1,situacao:'disponivel',comprador:null,telefone:null,pago:false,valor:5})));
  await $('reloadButton').click();await flush();context.__setTestPaymentDetails(paymentDetails);assert.equal($('heroCriterion').textContent,config.criterio_sorteio);
  const beforePages=createdCanvases.length;await $('campaignPosterButton').click();
  const pages=createdCanvases.slice(beforePages),pageCount=Math.ceil(quantity/100);assert.equal(pages.length,pageCount);
  assert.equal($('posterPageIndicator').textContent,'Imagem 1/'+pageCount);
  for(let page=0;page<pages.length;page++){
   const poster=pages[page],pageQuantity=Math.min(100,quantity-page*100);
   assert.equal(poster.width,1080);assert.equal(poster.height,1680);assert.equal(poster.width/poster.height,9/14);assert.equal(poster.rectCount,pageQuantity+7);
   const infoLabels=['ENTIDADE','CAMPANHA','VALOR','SITUAÇÃO'];
   for(const label of infoLabels){const item=poster.drawnPositions.find(position=>position.text===label);assert.ok(item,label+' deve aparecer no cabeçalho');assert.match(item.font,/21px/);}
   for(const [left,right] of [['ENTIDADE','CAMPANHA'],['VALOR','SITUAÇÃO']]){const a=poster.drawnPositions.find(position=>position.text===left),b=poster.drawnPositions.find(position=>position.text===right);assert.equal(a.y,b.y);assert.notEqual(a.x,b.x);assert.equal(b.x,1006,'segunda coluna do cabeçalho da arte fica alinhada à direita');}
   assert.ok(poster.drawnText.includes('RIFA'));assert.ok(poster.drawnText.includes(config.nome_rifa.toUpperCase()));assert.equal(poster.backgroundDraws,1);if(quantity===150)assert.ok(poster.drawnText.join(' ').includes('participante'),'prêmio longo deve caber na faixa inteira');
   const criterio=poster.drawnPositions.find(position=>position.text===config.criterio_sorteio);assert.ok(criterio);assert.match(criterio.font,/27px/);assert.equal(criterio.x,540);assert.equal(criterio.y,531);assert.equal(criterio.baseline,'middle');assert.ok(!poster.drawnText.includes('SORTEIO'));
   const gridRects=poster.rectangles.slice(-pageQuantity-1,-1);assert.equal(gridRects.length,pageQuantity);assert.ok(gridRects[0].w>gridRects[0].h);
   assert.equal(gridRects[0].x,42);if(pageQuantity>=10){assert.equal(gridRects[0].y,gridRects[9].y);assert.ok(gridRects[10].y>gridRects[0].y);}
   const first=String(page*100+1).padStart(3,'0'),last=String(page*100+pageQuantity).padStart(3,'0');
   assert.ok(poster.drawnText.includes('NÚMEROS '+first+'–'+last));assert.ok(poster.drawnText.includes('PÁGINA '+(page+1)+'/'+pageCount+'  ❯❯'));
   assert.ok(poster.drawnText.includes('PRÊMIO: '+config.descricao_premio));const premioLabel=poster.drawnPositions.find(position=>position.text==='PRÊMIO: '+config.descricao_premio);assert.ok(premioLabel);assert.equal(premioLabel.y,442);assert.equal(premioLabel.x,540);const premioRect=poster.rectangles.find(r=>r.x===38&&r.y===410),sorteioRect=poster.rectangles.find(r=>r.x===38&&r.y===492),contadoresRect=poster.rectangles.find(r=>r.x===42&&r.y===596);assert.ok(premioRect);assert.ok(sorteioRect);assert.ok(contadoresRect);assert.ok(sorteioRect.y>=premioRect.y+premioRect.h+16);assert.ok(contadoresRect.y>=sorteioRect.y+sorteioRect.h+20);assert.ok(poster.drawnText.includes(first));assert.ok(poster.drawnText.includes('(11) 98765-4321'));
   const phoneIndex=poster.drawnText.indexOf('(11) 98765-4321');assert.match(poster.drawnFonts[phoneIndex],/950 52px/);
  }
  assert.match($('posterMessage').textContent,/imagem|imagens/i);
  if(pageCount>1){const pageOneRects=pages[0].rectangles.slice(-101,-1),pageTwoQuantity=Math.min(100,quantity-100),pageTwoRects=pages[1].rectangles.slice(-pageTwoQuantity-1,-1);assert.equal(pageTwoRects[0].x,pageOneRects[0].x);assert.equal(pageTwoRects[0].y,pageOneRects[0].y);const firstUrl=$('campaignPosterPreview').src;$('posterNext').click();assert.equal($('posterPageIndicator').textContent,'Imagem 2/'+pageCount);assert.notEqual($('campaignPosterPreview').src,firstUrl);$('posterPrev').click();assert.equal($('posterPageIndicator').textContent,'Imagem 1/'+pageCount);}
  await $('posterShare').click();assert.equal(shareCalls,shareFileCounts.length);assert.equal(shareFileCounts.at(-1),pageCount);
  $('posterClose').click();
 }
 config.descricao_premio='Agasalho esportivo';config.quantidade_bilhetes=100;numbers.splice(100);await $('reloadButton').click();await flush();$('settingsCloseButton').click();

 assert.match(html,/id="posterPrev"/);assert.match(html,/id="posterNext"/);assert.match(html,/\.poster-pager\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);assert.match(html,/\.poster-pager button\{width:100%/);
 assert.equal($('historySection').hidden,false);
 assert.equal($('vendidos').textContent,1);
 $('drawButton').click();assert.equal($('drawChoiceDialog').open,true);
 await $('drawSold').click();await flush();
 assert.equal($('drawDialog').open,true);
 assert.ok(audioNodes.some(node=>node.starts>0),'a roleta inicia o áudio sintetizado');assert.equal(localStorageValues.get('rifa-som-sorteio'),'on');
 assert.equal($('drawSave').hidden,true);
 clock.runUntil(14999);assert.equal($('drawSave').hidden,true);
 clock.runUntil(15000);assert.equal($('drawSave').hidden,false);
 assert.match($('drawWinner').textContent,/Alice/);
 assert.match($('drawResult').textContent,/01/);
 assert.equal(ids.includes('drawSoundToggleActive'),false);
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
 assert.match(html,/\.actions\{display:grid;grid-template-columns:repeat\(2/);assert.match(html,/id="settingsPixType"/);assert.match(html,/id="settingsWhatsapp"/);assert.match(html,/id="restorePreviewDialog"/);assert.match(html,/id="campaignPosterButton"/);
 assert.match(html,/\.draw-options\{display:grid;grid-template-columns:repeat\(2/);
 failSync=false;multiCampaigns=true;await $('reloadButton').click();await flush();
 await $('backup').click();await flush();const blobBackup=downloads.findLast(x=>x?.type==='application/json');assert.ok(blobBackup);const backupData=JSON.parse(blobBackup.parts[0]);assert.equal(backupData.versao,4);assert.equal(backupData.campanha.id,'campaign-1');assert.equal(backupData.campanha.dadosPagamento.chave_pix,'12345678901');assert.equal(backupData.campanha.dadosPagamento.whatsapp,'11987654321');assert.equal(backupData.registros.length,100);assert.equal(backupData.sorteios.length,1);assert.ok(backupData.participantes.length>=1);
 elements.restore.files=[{text:async()=>JSON.stringify(backupData)}];await $('restore').change();assert.equal($('restorePreviewDialog').open,true);assert.match($('restorePreviewDetails').textContent,/Números: 100/);const beforePreventive=downloads.length;await $('restoreApply').click();await flush();assert.equal(restoreCalls.length,1);assert.equal(restoreCalls[0].p_campanha_id,'campaign-1');assert.equal(restoreCalls[0].p_backup.versao,4);assert.ok(downloads.length>beforePreventive);assert.equal($('restorePreviewDialog').open,false);
 elements.restore.files=[{text:async()=>JSON.stringify({aplicativo:'Rifa Deixa Vim',versao:3,exportadoEm:'2026-01-01',registros:{'1':{nome:'Backup Antigo',status:'reservado',telefone:'11999999999',valor:5}}})}];await $('restore').change();assert.equal($('restorePreviewDialog').open,true);assert.match($('restorePreviewDetails').textContent,/Versão: 3/);$('restoreCancel').click();
 const backupOutro={...backupData,campanha:{...backupData.campanha,id:'campaign-2'}};elements.restore.files=[{text:async()=>JSON.stringify(backupOutro)}];await $('restore').change();assert.equal($('restorePreviewDialog').open,false);assert.match(alerts.at(-1),/outra campanha/);
 assert.equal($('campaignSelect').children.length,1);assert.equal($('campaignSelect').disabled,true);
 assert.equal($('total').textContent,'R$\u00a05,00');assert.equal($('pendingTotal').textContent,'R$\u00a00,00');assert.equal($('grandTotal').textContent,'R$\u00a05,00');
 await $('newCampaignButton').click();assert.equal($('settingsForm').hidden,false);assert.equal($('settingsQuantity').value,100);
 assert.match($('settingsMessage').textContent,/começa sem bilhetes ocupados/);
 $('settingsPrize').value='Prêmio da campanha 02';await $('settingsForm').submit();await flush();
 assert.equal(campaignList.filter(c=>c.id==='campaign-2').length,1);assert.equal($('campaignSelect').value,'campaign-2');
 assert.equal($('heroRaffle').textContent,'Nova rifa');assert.equal($('vendidos').textContent,0);assert.equal($('grid').children.length,100);
 $('campaignSelect').value='campaign-1';await $('campaignSelect').change();await flush();
 assert.equal($('heroRaffle').textContent,'Rifa Atualizada');assert.equal($('vendidos').textContent,1);
 $('settingsButton').click();$('editCampaignButton').click();const prizeFile={type:'image/jpeg',size:2048,name:'produto.jpg'};elements.settingsPrizeImage.files=[prizeFile];await $('settingsPrizeImage').change();assert.match($('settingsPrizeImageStatus').textContent,/Foto pronta/);await $('settingsForm').submit();await flush();assert.ok(storedPrizeImages.has('rifa-premios/campaign-1/premio'));assert.match($('campaignNotice').textContent,/foto do prêmio/);$('settingsBack').click();const beforePrizeArt=createdCanvases.length;await $('campaignPosterButton').click();const prizeArtPages=createdCanvases.slice(beforePrizeArt);assert.equal(prizeArtPages.length,2);assert.equal(prizeArtPages[1].prizeDraws,1);assert.equal(prizeArtPages[1].width,1080);assert.equal(prizeArtPages[1].height,1680);assert.match($('posterMessage').textContent,/1 foto do prêmio/);$('posterNext').click();assert.equal($('posterPageIndicator').textContent,'Imagem 2/2');assert.ok(!prizeArtPages[1].rectangles.some(r=>r.x===70&&r.y===836));assert.ok(!prizeArtPages[1].strokedRectangles.some(r=>r.x===70&&r.y===836));await $('posterShare').click();assert.equal(shareFileCounts.at(-1),2);assert.ok(shareFileNames.at(-1).some(name=>/premio\.png$/.test(name)));$('posterClose').click();$('settingsCloseButton').click();
 $('drawButton').click();assert.equal($('drawChoiceDialog').open,true);$('drawVideoToggleChoice').click();assert.equal($('drawVideoToggleChoice')['aria-pressed'],'true');assert.equal(localStorageValues.get('rifa-video-sorteio'),'on');await $('drawSold').click();await flush();assert.equal($('drawDialog').open,true);assert.match($('drawVideoStatus').textContent,/foto do prêmio/);const videoCanvas=createdCanvases.find(canvas=>canvas.width===720&&canvas.height===1280);assert.ok(videoCanvas);assert.equal($('drawVideoPreviewHost').hidden,false);assert.equal($('drawWheel').style.display,'none');clock.runUntil(now+7999);assert.match($('drawCountdown').textContent,/Roleta começa em 1 segundo/);clock.runUntil(now+1);assert.equal($('drawVideoPreviewHost').hidden,true);assert.equal($('drawProgress').style.width,'0%');assert.ok(videoCanvas.prizeDraws>0,'a abertura do vídeo mostra a foto cadastrada do prêmio');assert.match(videoCanvas.drawnText.join(' '),/AGORA VAMOS REALIZAR O SORTEIO/);assert.match(videoCanvas.drawnText.join(' '),/BOA SORTE/);clock.runUntil(now+15000);assert.match($('drawWinner').textContent,/Alice/);clock.runUntil(now+12000);await flush();assert.equal($('drawVideoActions').hidden,false);assert.ok(bufferSources.length>=2,'as trilhas de introdução e de ganhador são reproduzidas na gravação');assert.match(videoCanvas.drawnText.join(' '),/PARABÉNS AO GANHADOR/);const entityHeaderPositions=videoCanvas.drawnPositions.filter((p,i)=>p.text==='Deixa Vim'&&p.y===118&&/36px/.test(videoCanvas.drawnFonts[i]));assert.ok(entityHeaderPositions.length>=3,'o nome da associação em destaque aparece nos três painéis');assert.match(videoCanvas.drawnText.join(' '),/Alice/);const winnerNamePulses=videoCanvas.drawnPositions.filter((p,i)=>p.text==='Alice'&&p.y===715).map((p,i)=>videoCanvas.drawnFonts[videoCanvas.drawnPositions.indexOf(p)]);assert.ok(new Set(winnerNamePulses).size>=2,'o nome do ganhador pulsa durante o vídeo');assert.match(videoCanvas.drawnText.join(' '),/Agasalho esportivo/);assert.match(videoCanvas.drawnText.join(' '),/DATA DO SORTEIO/);assert.match(videoCanvas.drawnText.join(' '),/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);assert.ok(videoCanvas.drawnPositions.some((p,i)=>p.y===1244&&/34px/.test(videoCanvas.drawnFonts[i])),'o nome da rifa fica maior no painel final');assert.ok(videoCanvas.prizeDraws>=2,'o vídeo usa a foto do prêmio na abertura e no resultado');$('drawVideoDownload').click();await $('drawVideoShare').click();assert.equal(shareFileCounts.at(-1),1);assert.match(shareFileNames.at(-1)[0],/\.mp4$/);assert.equal(shareFileTypes.at(-1)[0],'video/mp4');$('drawClose').click();$('drawVideoToggleChoice').click();assert.equal(localStorageValues.get('rifa-video-sorteio'),'off');
 assert.match(html,/id="campaignSelect"/);assert.match(html,/id="settingsHub"/);
 const migration=fs.readFileSync('supabase/migrations/20261026_etapa2_multiplas_campanhas.sql','utf8');
 assert.match(migration,/rifa_criar_campanha/);assert.match(migration,/primary key \(campanha_id, numero\)/i);
 assert.match(migration,/rifa_estado_publico\(p_campanha_id uuid\)/);assert.match(migration,/rifa_numeros set campanha_id/);
 const prizeMigration=fs.readFileSync('supabase/migrations/20261027_etapa10_imagem_premio_storage.sql','utf8');assert.match(prizeMigration,/values \('rifa-premios','rifa-premios',false,8388608/);assert.match(prizeMigration,/public\.rifa_administradores/);assert.match(prizeMigration,/public\.rifa_campanhas/);assert.doesNotMatch(prizeMigration,/drop table|delete from/i);assert.match(html,/id=\"settingsPrizeImage\"/);
 $('campaignSelect').value='campaign-1';await $('campaignSelect').change();await flush();
 $('grid').children[1].click();$('nome').value='João da Silva';$('telefone').value='(11) 90000-0000';$('status').value='reservado';await $('form').submit();await flush();
 assert.equal(participantRows.length,1);const participanteOriginal=participantRows[0].id;assert.equal(numbers[1].participante_id,participanteOriginal);
 assert.equal($('pendingTotal').textContent,'R$\u00a05,00');assert.equal($('grandTotal').textContent,'R$\u00a010,00');
 $('grid').children[2].click();$('nome').value='  JOAO   DA SILVA ';$('telefone').value='11900000000';$('status').value='vendido';await $('form').submit();await flush();
 assert.match($('participantMatchTitle').textContent,/já cadastrado/);assert.equal(participantRows.length,1);assert.equal($('participantMatches').children.length,1);
 $('participantMatches').children[0].children[0].click();await $('form').submit();await flush();assert.equal(numbers[2].participante_id,participanteOriginal);
 assert.equal($('entries').children.length,1);assert.ok($('entries').children.some(li=>/Nº 02, 03/.test(li.children[0].textContent)));
 $('grid').children[3].click();$('nome').value='Joao da Silva';$('telefone').value='11911112222';await $('form').submit();await flush();assert.equal(participantRows.length,1);confirmResult=false;await $('participantHomonym').click();await flush();assert.equal(participantRows.length,1);assert.equal(numbers[3].situacao,'disponivel');confirmResult=true;await $('participantHomonym').click();await flush();assert.equal(participantRows.length,2);assert.notEqual(numbers[3].participante_id,participanteOriginal);
 assert.equal(participantCalls.filter(x=>x.p_confirmar_homonimo).length,1);assert.match(html,/Último participante/);
 // Lote: dois números para um participante; pagamentos individuais e conjuntos; liberação segura.
 $('grid').children[0].click();assert.equal($('editor').open,false);assert.match($('notice').textContent,/registrado em sorteio/);
 $('bulkAddButton').click();await flush();assert.equal($('bulkFinishButton').hidden,false);assert.equal($('bulkStatusReservedButton')['aria-pressed'],'true');$('bulkStatusSoldButton').click();assert.equal($('bulkStatus').value,'vendido');assert.equal($('bulkStatusSoldButton')['aria-pressed'],'true');$('bulkStatusReservedButton').click();assert.equal($('bulkStatus').value,'reservado');assert.equal($('bulkStatusReservedButton')['aria-pressed'],'true');assert.equal($('grid').children[0].disabled,true);
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
 await $('reloadButton').click();await flush();assert.equal($('entries').children.length,1);
 assert.match($('entries').children[0].children[0].textContent,/Participante Extra 6/);
 $('showAllParticipants').click();assert.equal($('participantsPage').hidden,false);assert.equal($('rafflePage').hidden,true);
 assert.equal($('entries').children.length,1);assert.ok($('allParticipantsList').children.length>5);
 const linhasCarlos=$('allParticipantsList').children.filter(li=>li.children[0].textContent.includes('Carlos Souza'));assert.equal(linhasCarlos.length,1);
 assert.match(linhasCarlos[0].children[0].textContent,/Nº 05, 06, 07, 09, 10/);
 const linhasHomonimos=$('allParticipantsList').children.filter(li=>/Jo[ãa]o da Silva/.test(li.children[0].textContent));assert.equal(linhasHomonimos.length,2);
 assert.match($('allParticipantsList').children[0].children[0].textContent,/Participante Extra 6/);
 const resumoParticipante=$('allParticipantsList').children[0].children[0].textContent;assert.ok(resumoParticipante.includes('Nº 26')&&resumoParticipante.includes('Participação:')&&resumoParticipante.includes('Financeiro:')&&resumoParticipante.includes('Última movimentação:'));
 // Busca por nome, telefone e número; filtro de situação reduz os números mostrados.
 const dora=participantRows.find(x=>x.nome_completo==='Dora Teste');assert.ok(dora);dora.telefone='11912345678';numbers[10].telefone=dora.telefone;await $('reloadButton').click();await flush(); assert.equal($('reportReceived').textContent,$('total').textContent);assert.equal($('reportPending').textContent,$('pendingTotal').textContent);
 const doraReport=$('allParticipantsList').children.find(li=>li.children[0]?.textContent.includes('Dora Teste'));assert.ok(doraReport);assert.ok(doraReport.children[1].children.some(x=>x.href?.startsWith('https://wa.me/55119123')),'o lembrete permanece na ficha da lista unificada');
 const downloadsBeforeReport=downloads.length;$('exportFinanceReport').click();assert.equal(downloads.length,downloadsBeforeReport+1);assert.equal(downloads.at(-1).type,'text/csv;charset=utf-8');assert.match(downloads.at(-1).parts[0],/"Campanha";"Participante";"Telefone"/);
 $('participantsSituation').value='recebidos';$('participantsSituation').change();assert.equal($('allParticipantsList').children.some(li=>li.children[0]?.textContent.includes('Dora Teste')),false);
 $('participantsSituation').value='pendentes';$('participantsSituation').change();assert.ok($('allParticipantsList').children.some(li=>li.children[0]?.textContent.includes('Dora Teste')));$('participantsSituation').value='todas';$('participantsSituation').change();
 $('participantsSearch').value='carlos';$('participantsSearch').input();assert.equal($('allParticipantsList').children.length,1);assert.match($('allParticipantsList').children[0].children[0].textContent,/Carlos Souza/);
 $('participantsSituation').value='vendido';$('participantsSituation').change();assert.equal($('allParticipantsList').children.length,1);assert.match($('allParticipantsList').children[0].children[0].textContent,/3 vendido\(s\), 0 reservado/);
 $('participantsSituation').value='reservado';$('participantsSituation').change();assert.equal($('allParticipantsList').children.length,1);assert.match($('allParticipantsList').children[0].children[0].textContent,/0 vendido\(s\), 2 reservado/);
 $('participantsSearch').value='119123';$('participantsSearch').input();assert.equal($('allParticipantsList').children.length,1);assert.match($('allParticipantsList').children[0].children[0].textContent,/Dora Teste/);
 $('participantsSearch').value='11';$('participantsSituation').value='todas';$('participantsSearch').input();$('participantsSituation').change();assert.equal($('allParticipantsList').children.length,1);assert.match($('allParticipantsList').children[0].children[0].textContent,/Nº 11/);
 $('clearParticipantFilters').click();assert.equal($('participantsSearch').value,'');assert.equal($('participantsSituation').value,'todas');
 const linhaDora=$('allParticipantsList').children.find(li=>li.children[0].textContent.includes('Dora Teste'));assert.ok(linhaDora);linhaDora.children[1].children[0].click();await flush();assert.equal($('participantDetailDialog').open,true);
 await $('detailAddNumbers').click();await flush();assert.equal($('participantsPage').hidden,true,'ao adicionar número pela ficha, a tela de participantes deve sair');assert.equal($('rafflePage').hidden,false,'a grade da campanha precisa ficar visível para selecionar');assert.match($('selectionHint').textContent,/Dora Teste/);$('grid').children[11].click();await $('bulkFinishButton').click();await flush();assert.equal(numbers[11].participante_id,dora.id,'novo número deve ser associado ao participante existente');assert.equal($('participantDetailDialog').open,true,'após salvar, a ficha deve voltar a abrir');const numeroAdicionado=$('participantDetailNumbers').children.find(li=>li.numero===12);assert.ok(numeroAdicionado);numeroAdicionado.check.checked=true;await $('detailReleaseSelected').click();await flush();assert.equal(numbers[11].situacao,'disponivel','o registro de teste pode ser liberado sem deixar o financeiro alterado');$('detailClose').click();$('showAllParticipants').click();assert.equal($('participantsPage').hidden,false);
 $('detailEditParticipant').click();assert.equal($('participantEditDialog').open,true);$('participantEditName').value='Carlos Souza';$('participantEditPhone').value='11922223333';await $('participantEditForm').submit();await flush();assert.equal($('participantEditMatchPanel').hidden,false);
 $('participantEditConfirmHomonym').click();await flush();assert.equal(dora.nome_completo,'Carlos Souza');assert.equal(dora.telefone,'11922223333');assert.equal(numbers[10].comprador,'Carlos Souza');assert.equal(numbers[10].telefone,'11922223333');assert.equal($('participantDetailDialog').open,true);
 // A identidade ligada a números vendidos permanece protegida também na interface.
 $('detailClose').click();$('participantsSearch').value='05';$('participantsSearch').input();const linhaPago=$('allParticipantsList').children.find(li=>li.children[0].textContent.includes('Nº 05'));assert.ok(linhaPago);linhaPago.children[1].children[0].click();await flush();$('detailEditParticipant').click();$('participantEditName').value='Nome alterado';await $('participantEditForm').submit();await flush();assert.match($('participantEditMessage').textContent,/vendido, pago ou sorteado/);assert.equal(carlos.nome_completo,'Carlos Souza');$('participantEditCancel').click();await flush();
 $('participantsBack').click();assert.equal($('participantsPage').hidden,true);assert.equal($('rafflePage').hidden,false);
 $('showAllParticipants').click();assert.equal($('participantsPage').hidden,false);
 anteriores.forEach((r,i)=>numbers[20+i]=r);await $('reloadButton').click();await flush();
 $('participantsBack').click();$('campaignSelect').value='campaign-2';await $('campaignSelect').change();await flush();$('settingsButton').click();assert.equal($('deleteCampaignButton').disabled,false);
 $('clearCampaignDataButton').click();assert.equal($('campaignDataConfirmDialog').open,true);assert.match($('campaignDataConfirmDescription').textContent,/compradores, reservas, vendas, pagamentos e o histórico/);assert.equal($('campaignDataConfirmCampaign').textContent,'Campanha selecionada: Campanha 02');assert.equal($('campaignDataConfirmSubmit').disabled,false);assert.equal(ids.includes('campaignDataConfirmInput'),false);await $('campaignDataConfirmForm').submit();await flush();assert.equal(clearedCampaignCalls.length,1);assert.equal(clearedCampaignCalls[0].p_campanha_id,'campaign-2');assert.equal(clearedCampaignCalls[0].p_confirmacao,'Campanha 02');assert.equal($('campaignSelect').value,'campaign-2','limpar os dados deve manter a campanha selecionada');assert.ok($('campaignSelect').children.some(option=>option.value==='campaign-2'),'a campanha limpa deve continuar disponível no seletor');assert.match($('campaignDataActionStatus').textContent,/pronta para novos testes/);
 $('deleteCampaignButton').click();assert.equal($('campaignDataConfirmCampaign').textContent,'Campanha selecionada: Campanha 02');await $('campaignDataConfirmForm').submit();await flush();assert.equal(deletedCampaignCalls.length,1);assert.equal(deletedCampaignCalls[0].p_campanha_id,'campaign-2');assert.equal(deletedCampaignCalls[0].p_confirmacao,'Campanha 02');assert.equal($('campaignSelect').value,'campaign-1');assert.match($('campaignDataActionStatus').textContent,/foi excluída/);
 session=false;authorized=false;await $('reloadButton').click();await flush();
 assert.equal($('participantsPage').hidden,true);assert.equal($('allParticipantsList').children.length,0);assert.equal(ids.includes('financeReportList'),false);assert.equal(ids.includes('financeReportFilter'),false);
 assert.equal($('drawButton').hidden,true);assert.equal($('confirmPaymentButton').hidden,true);
 assert.equal($('total').textContent,'R$\u00a032,50');assert.equal($('pendingTotal').textContent,'R$\u00a032,50');assert.equal($('grandTotal').textContent,'R$\u00a065,00');
 assert.match(html,/id="drawSoundToggleChoice"/);assert.doesNotMatch(html,/id="drawSoundToggleActive"/);assert.match(html,/new AudioContextSorteio\(\)/);assert.match(html,/pessoasOrdenadas\.slice\(0,1\)/);assert.doesNotMatch(html,/pessoasOrdenadas\.slice\(0,5\)/);assert.match(html,/class="actions main-actions"/);assert.match(html,/class="finance-summary"/);assert.match(html,/id="statusReservedButton"/);assert.match(html,/id="statusSoldButton"/);assert.match(html,/id="bulkStatusReservedButton"/);assert.match(html,/id="bulkStatusSoldButton"/);assert.ok(html.includes('.status-choice button[aria-pressed="true"]'));assert.match(html,/id="settingsHub"[\s\S]*id="backup"/);assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);assert.match(html,/navigator\.serviceWorker\.register/);assert.match(html,/id="pwaInstallButton"/);const pwaManifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(pwaManifest.display,'standalone');assert.equal(pwaManifest.scope,'./');assert.equal(pwaManifest.icons.length,3);for(const icon of pwaManifest.icons){const iconBytes=fs.readFileSync(icon.src.replace('./',''));assert.equal(iconBytes.toString('hex',0,4),'89504e47');assert.equal(iconBytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));assert.equal(iconBytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));}assert.match(fs.readFileSync('sw.js','utf8'),/cache:'no-store'/);
 assert.match(html,/id="settingsButton"[^>]*aria-label="Abrir configurações"[^>]*>⚙/);assert.match(html,/id="clearCampaignDataButton"/);assert.match(html,/id="deleteCampaignButton"/);assert.match(html,/id="campaignDataConfirmCampaign"/);assert.doesNotMatch(html,/campaignDataConfirmInput|Digite o nome exato da campanha/);assert.match(html,/hero-description>:nth-child\(2\)\{text-align:right\}/);assert.match(html,/hero-meta>:nth-child\(2\)\{text-align:right\}/);assert.doesNotMatch(html,/stroke="#f1d68a" stroke-opacity=".5"/);assert.match(html,/heroCriterion'\)\.textContent = configuracao\.criterio_sorteio/);assert.match(html,/textoCriterio=String\(configuracao\.criterio_sorteio\|\|''\)\.trim\(\)/);
 for(const id of ['participantsBack','settingsCloseButton','settingsBack','paymentChoiceClose','signupCancel','accountCancel'])assert.match(html,new RegExp('<button(?=[^>]*id="'+id+'")(?![^>]*nav-dismiss)(?=[^>]*nav-back)[^>]*><svg class="nav-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'));
 for(const id of ['campaignDataConfirmCancel','restoreCancel','posterClose','drawCancel','drawClose','authCancel','cancel','detailClose','participantEditCancel','bulkClose','bulkCancelButton'])assert.match(html,new RegExp('<button(?=[^>]*id="'+id+'")(?=[^>]*nav-dismiss)[^>]*><svg class="nav-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>'));
 const migration14=fs.readFileSync('supabase/migrations/20261028_etapa14_limpar_excluir_campanha.sql','utf8');assert.match(migration14,/rifa_limpar_dados_campanha/);assert.match(migration14,/rifa_excluir_campanha/);assert.match(migration14,/public\.rifa_administradores/);assert.match(migration14,/Mantenha ao menos uma campanha cadastrada/);assert.match(migration14,/revoke all on function public\.rifa_excluir_campanha/);assert.match(migration14,/create policy rifa_premio_admin_excluir/);assert.doesNotMatch(migration14,/drop table|truncate/i);
 const migration16=fs.readFileSync('supabase/migrations/20261028_etapa16_liberar_limpeza_confirmada.sql','utf8');assert.match(migration16,/current_setting\('rifa\.limpeza_campanha_autorizada', true\)/);assert.match(migration16,/v_campanha_autorizada = old\.campanha_id::text/);assert.match(migration16,/exists \([\s\S]*?rifa_administradores/);assert.equal((migration16.match(/set_config\('rifa\.limpeza_campanha_autorizada'/g)||[]).length,4);assert.match(migration16,/rifa_limpar_dados_campanha/);assert.match(migration16,/rifa_excluir_campanha/);assert.match(migration16,/Número pago protegido contra alteração/);assert.match(migration16,/Número pago ou registrado em sorteio não pode ser removido/);assert.doesNotMatch(migration16,/drop table|truncate/i);
 assert.ok(fs.statSync('assets/audio/introducao-suspense.wav').size>500000);assert.ok(fs.statSync('assets/audio/ganhador-festivo.wav').size>250000);assert.match(html,/assets\/audio\/introducao-suspense\.wav/);assert.match(html,/assets\/audio\/ganhador-festivo\.wav/);
 console.log('PASS: Etapas 1–27 — trilhas aprovadas, gravação, cabeçalhos, nome do ganhador pulsante, compartilhamento, campanhas e PWA');
})().catch(e=>{console.error(e);process.exitCode=1});
