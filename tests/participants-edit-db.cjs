const fs=require('fs'),assert=require('assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const ids={admin:'00000000-0000-4000-8000-000000000001',user:'00000000-0000-4000-8000-000000000002',c1:'00000000-0000-4000-8000-000000000101',c2:'00000000-0000-4000-8000-000000000102'};
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon nologin; create role authenticated nologin;
   create schema auth; grant usage on schema auth,public to anon,authenticated;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create table auth.users(id uuid primary key);
   create table public.rifa_administradores(user_id uuid primary key references auth.users(id));
   alter table public.rifa_administradores enable row level security;
   grant select on public.rifa_administradores to authenticated;
   create policy admin_self on public.rifa_administradores for select to authenticated using(user_id=auth.uid());
   create table public.rifa_configuracoes(campanha_id uuid primary key,quantidade_bilhetes integer not null,valor_bilhete numeric not null);
   create table public.rifa_sorteios(campanha_id uuid not null,numero integer not null);
   create table public.rifa_numeros(campanha_id uuid not null,numero integer not null,situacao text not null,comprador text,telefone text,pago boolean not null default false,valor numeric,atualizado_em timestamptz,primary key(campanha_id,numero));
   insert into auth.users values('${ids.admin}'),('${ids.user}');
   insert into public.rifa_administradores values('${ids.admin}');
   insert into public.rifa_configuracoes values('${ids.c1}',10,5),('${ids.c2}',10,7);
   insert into public.rifa_numeros(campanha_id,numero,situacao,pago,valor,atualizado_em)
    select c.id,n,'disponivel',false,5,now() from unnest(array['${ids.c1}'::uuid,'${ids.c2}'::uuid]) c(id) cross join generate_series(1,10) n;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261026_etapa4_participantes.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261026_etapa5_multiplos_numeros.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261027_etapa8_editar_participantes.sql','utf8'));
  async function role(name,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+name)}
await role('anon');
  await assert.rejects(()=>db.query('select public.rifa_editar_participante($1,$2,$3,false)',[ids.admin,'X','']),e=>e.code==='42501');
  await assert.rejects(()=>db.query('select * from public.rifa_participantes'));
await role('authenticated',ids.user);
  await assert.rejects(()=>db.query('select public.rifa_editar_participante($1,$2,$3,false)',[ids.admin,'X','']),e=>e.code==='42501');
  await assert.rejects(()=>db.query("update public.rifa_participantes set nome_completo='Intruso'"));
  await db.exec('reset role');await db.exec('grant select,update on public.rifa_numeros to authenticated; grant select on public.rifa_sorteios to authenticated');
  await role('authenticated',ids.admin);
  async function reservar(campanha,numero,nome,telefone,participanteId=null,situacao='reservado'){
   return (await db.query('select public.rifa_reservar_numeros_lote($1,array[$2]::integer[],$3,$4,$5,$6,false) data',[campanha,numero,situacao,nome,telefone,participanteId])).rows[0].data;
  }
const ana=await reservar(ids.c1,1,'Ana Silva','(11) 91111-1111');assert.equal(ana.status,'salvo');
  await reservar(ids.c2,1,'Ana Silva','',ana.participante_id);
  await reservar(ids.c1,2,'Bruno Souza','11922222222');
  await reservar(ids.c1,3,'Carla Costa','11933333333');
  await reservar(ids.c1,4,'Diego Lima','11944444444');
const edit=await db.query('select public.rifa_editar_participante($1,$2,$3,false) data',[ana.participante_id,'Ana Costa','(11) 98888-7777']);
  assert.equal(edit.rows[0].data.status,'salvo');
  assert.deepEqual((await db.query('select nome_completo,telefone,nome_normalizado,telefone_normalizado from public.rifa_participantes where id=$1',[ana.participante_id])).rows[0],{nome_completo:'Ana Costa',telefone:'(11) 98888-7777',nome_normalizado:'ana costa',telefone_normalizado:'11988887777'});

  const duplicate=await db.query('select public.rifa_editar_participante($1,$2,$3,false) data',[ana.participante_id,'Bruno Souza','(11) 98888-7777']);
  assert.equal(duplicate.rows[0].data.status,'duplicado');assert.equal(duplicate.rows[0].data.candidatos.length,1);
  assert.equal((await db.query('select nome_completo from public.rifa_participantes where id=$1',[ana.participante_id])).rows[0].nome_completo,'Ana Costa');
  const homonym=await db.query('select public.rifa_editar_participante($1,$2,$3,true) data',[ana.participante_id,'Bruno Souza','(11) 98888-7777']);
  assert.equal(homonym.rows[0].data.status,'salvo');
  assert.equal((await db.query("select count(*)::int n from public.rifa_participantes where nome_normalizado='bruno souza'")).rows[0].n,2);
const paid=await reservar(ids.c2,2,'Carla Pagamento','11933333333',null,'vendido');assert.equal(paid.status,'salvo');
  const paidEdit=await db.query('select public.rifa_editar_participante($1,$2,$3,false) data',[paid.participante_id,'Carla Nova','11933333333']);
  assert.equal(paidEdit.rows[0].data.status,'protegido');
  assert.equal((await db.query('select nome_completo from public.rifa_participantes where id=$1',[paid.participante_id])).rows[0].nome_completo,'Carla Pagamento');
  await db.exec('reset role');await db.query('insert into public.rifa_sorteios values($1,4)',[ids.c1]);await role('authenticated',ids.admin);
  const drawId=(await db.query('select participante_id from public.rifa_numeros where campanha_id=$1 and numero=4',[ids.c1])).rows[0].participante_id;
  const drawEdit=await db.query('select public.rifa_editar_participante($1,$2,$3,false) data',[drawId,'Diego Novo','11944444444']);
  assert.equal(drawEdit.rows[0].data.status,'protegido');
  await assert.rejects(()=>db.query('select public.rifa_editar_participante($1,$2,$3,false)',[ana.participante_id,' ','']),e=>e.code==='22023');
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from public.rifa_participantes where nome_completo in (\'Ana Costa\',\'Bruno Souza\')')).rows[0].n,2);
  console.log('PASS Etapa 8 PostgreSQL isolado: edição administrativa sincroniza campanhas; nome duplicado exige confirmação; venda/sorteio bloqueiam alteração; visitante e usuário não administradores bloqueados; RLS preservada');
 }finally{await db.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});