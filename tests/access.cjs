const fs=require('fs'),vm=require('vm');
// Reutiliza somente o ambiente isolado do smoke, sem executar seus cenários.
const base=fs.readFileSync('tests/smoke.cjs','utf8');
const prefix=base.split(/\(async\(\)=>\{\r?\n await vm/)[0];
const scenarios=String.raw`
let authListener, signupCalls=0, signupError=false, immediateSignup=false, ownError=false, linkedEmail=null, bindings=0, privateReads=0, publicReads=0, lastSignup;
const originalQuery=supabase.from;
supabase.from=table=>{if(table==='rifa_numeros')privateReads++;return originalQuery(table)};
supabase.auth.onAuthStateChange=fn=>{authListener=fn;return {data:{subscription:{unsubscribe(){}}}}};
supabase.auth.signUp=async args=>{signupCalls++;lastSignup=args;return signupError?{error:Error('rate limit')}:{data:{session:immediateSignup?{user:{id:'admin'}}:null},error:null}};
const originalRpc=supabase.rpc;
supabase.rpc=(name,args)=>{
 if(name==='rifa_estado_publico')publicReads++;
 if(name==='rifa_minhas_participacoes')return {order(){return this},range(){return Promise.resolve({data:ownError?null:[{numero:1,situacao:'vendido',pago:true,valor:5}],error:ownError?Error('offline'):null})}};
 if(name==='rifa_conta_numero')return Promise.resolve({data:linkedEmail,error:null});
 if(name==='rifa_vincular_acesso_numero'){bindings++;linkedEmail=args.p_login;return Promise.resolve({error:null})}
 return originalRpc(name,args);
};
(async()=>{
 session=false;authorized=false;multiCampaigns=true;
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 assert.equal($('accessPage').hidden,false);assert.equal($('rafflePage').hidden,true);
 assert.equal($('drawButton').hidden,true);assert.equal(privateReads,0);
 $('accessGuest').click();assert.equal($('rafflePage').hidden,false);assert.equal($('accountStatus').textContent,'Visitante');
 assert.equal($('entries').children.length,0);assert.equal($('ownParticipations').hidden,true);
 const authenticate=supabase.auth.signInWithPassword;
 // A conta fraca solicitada existe só neste mock, sem conta ou bypass no app/produção.
 supabase.auth.signInWithPassword=async args=>{assert.equal(args.email,'padrao@rifa-deixa-vim.invalid');assert.equal(args.password,'123');session=true;return {error:null}};
 $('accessLogin').click();$('email').value='padrao';$('password').value='123';
 await $('authForm').submit();await flush();
 assert.equal($('accountStatus').textContent,'Usuário');assert.equal($('accessPage').hidden,true);
 assert.equal($('ownParticipations').hidden,false);assert.equal($('ownList').children.length,1);
 assert.match($('ownList').children[0].textContent,/Número 01.*Pago/);
 assert.equal($('logoutButton').hidden,false);assert.equal($('settingsButton').hidden,true);
 assert.equal($('backup').hidden,true);assert.equal($('historyList').children.length,0);assert.equal(privateReads,0);
 assert.equal($('grid').children.some(e=>String(e.title).includes('Alice')),false);
 const previousInserts=inserts;$('drawButton').click();assert.equal($('drawChoiceDialog').open,false);assert.equal(inserts,previousInserts);
 // Uma falha na consulta privada remove os dados da tela.
 ownError=true;await $('reloadButton').click();await flush();assert.equal($('ownList').children.length,0);assert.equal($('entries').children.length,0);
 ownError=false;await $('reloadButton').click();await flush();assert.equal($('ownList').children.length,1);
 failLogout=true;await $('logoutButton').click();await flush();assert.equal($('ownList').children.length,0);assert.equal($('rafflePage').hidden,true);assert.equal($('accessLogout').hidden,false);assert.equal($('accessGuest').disabled,true);
 failLogout=false;await $('accessLogout').click();await flush();assert.equal($('accessPage').hidden,false);assert.equal($('accessLogout').hidden,true);
 // Cadastro: senha fraca, confirmação divergente, sucesso com confirmação e falha.
 $('accessSignup').click();$('signupEmail').value='joao_silva';$('signupPassword').value='123';$('signupConfirm').value='123';
 await $('signupForm').submit();assert.equal(signupCalls,0);
 $('signupPassword').value='UmaSenhaForte123';$('signupConfirm').value='OutraSenha123';await $('signupForm').submit();assert.equal(signupCalls,0);
 $('signupConfirm').value='UmaSenhaForte123';await $('signupForm').submit();assert.equal(signupCalls,1);
 assert.match($('signupMessage').textContent,/não foi possível iniciar a sessão/);assert.equal($('signupPassword').value,'');assert.equal($('signupConfirm').value,'');
 assert.deepEqual(Object.keys(lastSignup).sort(),['email','password']);assert.equal(lastSignup.email,'joao_silva@rifa-deixa-vim.invalid');
 signupError=true;$('signupPassword').value='UmaSenhaForte123';$('signupConfirm').value='UmaSenhaForte123';await $('signupForm').submit();assert.match($('signupMessage').textContent,/Não foi possível/);
 $('signupCancel').click();assert.equal($('signupPassword').value,'');
 // Restauração da sessão existente e vínculo administrativo explícito.
 supabase.auth.signInWithPassword=authenticate;session=true;authorized=true;
 await $('reloadButton').click();await flush();assert.equal($('accountStatus').textContent,'Administrador');assert.equal($('drawButton').hidden,false);
 $('grid').children[0].click();assert.equal($('editor').open,true);assert.equal($('saveNumberButton').hidden,true);assert.equal($('nome').disabled,true);assert.equal($('accountAccessButton').hidden,false);await $('accountAccessButton').click();assert.equal($('accountDialog').open,true);
 $('accountEmail').value='joao_silva';confirmResult=false;await $('accountForm').submit();assert.equal(bindings,0);
 confirmResult=true;await $('accountForm').submit();assert.equal(bindings,1);assert.equal(linkedEmail,'joao_silva');
 await $('accountUnlink').click();assert.equal(bindings,2);assert.equal(linkedEmail,null);
 // Saída em outra aba limpa imediatamente informação privada e diálogos.
 session=false;authListener('SIGNED_OUT',null);assert.equal($('entries').children.length,0);assert.equal($('accountDialog').open,false);assert.equal($('drawButton').hidden,true);
 clock.runUntil(now);await flush();assert.equal($('accessPage').hidden,false);
 // Cadastro com sessão imediata também entra com o perfil validado, sem escolher privilégio.
 signupError=false;immediateSignup=true;session=true;authorized=false;
 $('signupPassword').value='UmaSenhaForte123';$('signupConfirm').value='UmaSenhaForte123';
 await $('signupForm').submit();await flush();assert.equal($('accountStatus').textContent,'Usuário');assert.equal($('drawButton').hidden,true);
 // Uma resposta atrasada de autenticação não deve reabrir o acesso após saída.
 const getUser=supabase.auth.getUser;let resolver,consultando=false;
 supabase.auth.getUser=()=>new Promise(resolve=>{resolver=resolve;consultando=true});
 const pending=$('reloadButton').click();await flush();assert.equal(consultando,true);
 session=false;authListener('SIGNED_OUT',null);resolver({data:{user:{id:'admin'}},error:null});
 await pending;await flush();assert.equal($('ownList').children.length,0);assert.equal($('drawButton').hidden,true);assert.equal($('accessPage').hidden,false);
 supabase.auth.getUser=getUser;
 assert.ok(publicReads>0);assert.ok(privateReads>0);
 console.log('PASS: visitante, usuário, administrador, sessão automática, cadastro sem confirmação por e-mail, isolamento de dados, falhas de rede/logout, vínculo explícito e saída em outra aba');
})().catch(e=>{console.error(e);process.exitCode=1});
`;
vm.runInThisContext('(function(require){'+prefix+'\n'+scenarios+'})',{filename:'access-isolated.cjs'})(require);
