const fs=require('fs'),assert=require('assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const ids={admin:'00000000-0000-4000-8000-000000000001',user:'00000000-0000-4000-8000-000000000002',c1:'00000000-0000-4000-8000-000000000101',c2:'00000000-0000-4000-8000-000000000102',c3:'00000000-0000-4000-8000-000000000103',person:'00000000-0000-4000-8000-000000000202',draw1:'00000000-0000-4000-8000-000000000301',draw2:'00000000-0000-4000-8000-000000000302'};
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(fs.readFileSync('tests/etapa9_setup.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261026_etapa4_participantes.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261026_etapa5_multiplos_numeros.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261027_etapa9_backup_dados_pagamento.sql','utf8'));
  await db.exec('grant select on public.rifa_numeros,public.rifa_sorteios to authenticated');
  async function role(name,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+name)}
  await role('anon');
  await assert.rejects(()=>db.query('select public.rifa_obter_dados_campanha_admin($1)',[ids.c1]),e=>e.code==='42501');
  await assert.rejects(()=>db.query("select public.rifa_restaurar_backup_campanha($1,'{}'::jsonb)",[ids.c1]),e=>e.code==='42501');
  await assert.rejects(()=>db.query('select * from public.rifa_dados_campanha_admin'));
  await role('authenticated',ids.user);
  await assert.rejects(()=>db.query('select public.rifa_obter_dados_campanha_admin($1)',[ids.c1]),e=>e.code==='42501');
  await assert.rejects(()=>db.query("select public.rifa_salvar_configuracoes_campanha_etapa9($1,'E','C','R','P',5,5,'S','em_andamento','','','')",[ids.c1]),e=>e.code==='42501');
  await role('authenticated',ids.admin);
  await assert.rejects(()=>db.query("select public.rifa_restaurar_backup_campanha($1,'{}'::jsonb)",[ids.c1]),e=>e.code==='22023');
  const blank=(await db.query('select public.rifa_obter_dados_campanha_admin($1) data',[ids.c1])).rows[0].data;
  assert.equal(blank.chave_pix,'');assert.equal(blank.whatsapp,'');
  await assert.rejects(()=>db.query("select public.rifa_salvar_configuracoes_campanha_etapa9($1,'E','C','R','P',5,5,'S','em_andamento','cpf_cnpj','123','11912345678')",[ids.c1]),e=>e.code==='22023');
  assert.equal((await db.query('select nome_campanha from public.rifa_configuracoes where campanha_id=$1',[ids.c1])).rows[0].nome_campanha,'Campanha Um');
  await db.query("select public.rifa_salvar_configuracoes_campanha_etapa9($1,'Deixa Vim','Campanha Um','Rifa Um','Prêmio',5,5,'Sorteio divulgado','em_andamento','cpf_cnpj','12345678901','(11) 98765-4321')",[ids.c1]);
  const saved=(await db.query('select public.rifa_obter_dados_campanha_admin($1) data',[ids.c1])).rows[0].data;
  assert.equal(saved.chave_pix,'12345678901');assert.equal(saved.tipo_chave_pix,'cpf_cnpj');assert.equal(saved.whatsapp,'(11) 98765-4321');
  await assert.rejects(()=>db.query('select * from public.rifa_dados_campanha_admin'));

  const backup={
   aplicativo:'Rifa Deixa Vim',versao:4,exportadoEm:'2026-10-27T12:00:00.000Z',
   campanha:{id:ids.c1,configuracao:{nome_entidade:'Deixa Vim',nome_campanha:'Campanha Restaurada',nome_rifa:'Rifa Restaurada',
    descricao_premio:'Prêmio Restaurado',quantidade_bilhetes:6,valor_bilhete:6,criterio_sorteio:'Sorteio divulgado',situacao:'em_andamento'},
    dadosPagamento:{tipo_chave_pix:'email',chave_pix:'premio@example.com',whatsapp:'11987654321'}},
   participantes:[{id:ids.person,nome_completo:'Participante Backup',telefone:'11944444444',numeros:[4,5]}],
   registros:[
    {numero:1,situacao:'vendido',comprador:'Backup tentou trocar reserva',telefone:'11955555555',pago:true,valor:5,participante_id:ids.person},
    {numero:2,situacao:'reservado',comprador:'Backup tentou trocar pagamento',telefone:'11955555555',pago:false,valor:5,participante_id:ids.person},
    {numero:3,situacao:'vendido',comprador:'Backup tentou trocar sorteado',telefone:'11955555555',pago:true,valor:5,participante_id:ids.person},
    {numero:4,situacao:'reservado',comprador:'Participante Backup',telefone:'11944444444',pago:false,valor:6,participante_id:ids.person},
    {numero:5,situacao:'vendido',comprador:'Participante Backup',telefone:'11944444444',pago:true,valor:6,participante_id:ids.person},
    {numero:6,situacao:'disponivel',comprador:null,telefone:null,pago:false,valor:6,participante_id:null}
   ],
   sorteios:[
    {id:ids.draw1,numero:3,modalidade:'todos',situacao:'disponivel',ganhador:null,participantes:5,realizado_em:'2026-10-27T10:00:00.000Z'},
    {id:ids.draw2,numero:6,modalidade:'vendidos',situacao:'vendido',ganhador:'Participante Backup',participantes:4,realizado_em:'2026-10-27T11:00:00.000Z'}
   ]
  };
  const result=(await db.query('select public.rifa_restaurar_backup_campanha($1,$2::jsonb) data',[ids.c1,JSON.stringify(backup)])).rows[0].data;
  assert.deepEqual(result,{registros_restaurados:2,registros_preservados:3,sorteios_restaurados:1,sorteios_duplicados:1});
  const c1=(await db.query('select numero,situacao,pago,comprador,valor,participante_id from public.rifa_numeros where campanha_id=$1 order by numero',[ids.c1])).rows;
  assert.equal(c1[0].situacao,'reservado');assert.equal(c1[0].comprador,'Atual Reservado');
  assert.equal(c1[1].situacao,'vendido');assert.equal(c1[1].comprador,'Atual Pago');
  assert.equal(c1[2].situacao,'disponivel');assert.equal(c1[2].comprador,null);
  assert.equal(c1[3].situacao,'reservado');assert.equal(c1[4].situacao,'vendido');
  assert.equal(c1[3].participante_id,ids.person);assert.equal(c1[4].participante_id,ids.person);
  assert.equal(Number(c1[4].valor),6);
  const c2=(await db.query('select situacao,comprador,pago from public.rifa_numeros where campanha_id=$1 and numero=1',[ids.c2])).rows[0];
  assert.deepEqual(c2,{situacao:'vendido',comprador:'Outra Campanha',pago:true});
  const c2config=(await db.query('select nome_campanha,quantidade_bilhetes from public.rifa_configuracoes where campanha_id=$1',[ids.c2])).rows[0];
  assert.deepEqual(c2config,{nome_campanha:'Campanha Dois',quantidade_bilhetes:5});
  const restoredPrivate=(await db.query('select public.rifa_obter_dados_campanha_admin($1) data',[ids.c1])).rows[0].data;
  assert.equal(restoredPrivate.chave_pix,'premio@example.com');assert.equal(restoredPrivate.whatsapp,'11987654321');
  assert.equal((await db.query('select count(*)::int n from public.rifa_sorteios where campanha_id=$1',[ids.c1])).rows[0].n,2);
  const created=(await db.query("select public.rifa_criar_campanha_etapa9('Deixa Vim','Campanha Três','Rifa Três','Prêmio 3',3,3,'Sorteio','em_andamento','telefone','11999999999','11988887777') id")).rows[0].id;
  assert.equal(created,ids.c3);
  const createdPrivate=(await db.query('select public.rifa_obter_dados_campanha_admin($1) data',[ids.c3])).rows[0].data;assert.equal(createdPrivate.chave_pix,'11999999999');assert.equal(createdPrivate.whatsapp,'11988887777');
  console.log('PASS Etapa 9 PostgreSQL isolado: dados Pix/WhatsApp privados; alterações atômicas; restauração inclui configuração, participantes, bilhetes e sorteios; dados ocupados e de outras campanhas são preservados; permissões administrativas aplicadas');
 }finally{await db.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});