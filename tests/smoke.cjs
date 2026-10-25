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
let history=[],inserts=0,signIns=0;
function query(table){
 const q={
  select(){return q},eq(){return q},order(){return q},limit(){return Promise.resolve({data:history.slice(),error:null})},
  maybeSingle(){return Promise.resolve({data:authorized?{user_id:'admin'}:null,error:null})},
  insert(row){inserts++;history.push({...row,realizado_em:new Date().toISOString()});return Promise.resolve({error:null})},
  update(){return q},
  then(resolve,reject){return Promise.resolve({data:failSync?null:numbers.map(x=>({...x})),error:failSync?new Error('offline'):null}).then(resolve,reject)}
 };return q;
}
const supabase={
 auth:{
  getSession:async()=>({data:{session:session?{user:{id:'admin'}}:null},error:null}),
  getUser:async()=>({data:{user:session?{id:'admin'}:null},error:null}),
  signInWithPassword:async()=>{signIns++;session=true;return {error:null}},
  signOut:async()=>{if(failLogout)return {error:new Error('offline')};session=false;return {error:null}}
 },
 from:query,
 rpc:async()=>({data:failSync?null:numbers.map(({numero,situacao})=>({numero,situacao})),error:failSync?new Error('offline'):null})
};
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
 failSync=true;await $('reloadButton').click();await flush();
 assert.equal($('drawButton').hidden,true);
 assert.equal($('historyList').children.length,0);
 assert.equal($('entries').children.length,0);
 assert.equal($('livres').textContent,'…');
 assert.match($('notice').textContent,/Falha na sincronização/);
 assert.match(html,/\.actions\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(html,/\.draw-options\{display:grid;grid-template-columns:repeat\(2/);
 console.log('PASS: sintaxe, consulta pública/admin, roleta 15 s, modos, ganhador, não vendido, confirmação, salvamento, histórico, login, logout com falha, limpeza após falha e botões em duas colunas');
})().catch(e=>{console.error(e);process.exitCode=1});
