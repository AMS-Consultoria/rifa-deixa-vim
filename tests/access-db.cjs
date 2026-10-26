const fs=require('fs'),assert=require('assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const ids={admin:'00000000-0000-4000-8000-000000000001',a:'00000000-0000-4000-8000-000000000002',b:'00000000-0000-4000-8000-000000000003',c1:'00000000-0000-4000-8000-000000000101',c2:'00000000-0000-4000-8000-000000000102'};
(async()=>{
const db=new PGlite();
try{
 await db.exec(`
 create role anon nologin;create role authenticated nologin;
 create schema auth;grant usage on schema auth,public to anon,authenticated;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
 create table public.rifa_administradores(user_id uuid primary key references auth.users);
 alter table public.rifa_administradores enable row level security;
 grant select on public.rifa_administradores to authenticated;
 create policy admin_self on public.rifa_administradores for select to authenticated using(user_id=auth.uid());
 create table public.rifa_configuracoes(campanha_id uuid primary key,quantidade_bilhetes integer);
 create table public.rifa_numeros(campanha_id uuid,numero integer,situacao text,pago boolean,valor numeric,comprador text,telefone text,primary key(campanha_id,numero));
 insert into auth.users(id,email) values('${ids.admin}','admin@example.test');
 insert into public.rifa_administradores values('${ids.admin}');
 insert into public.rifa_configuracoes values('${ids.c1}',2),('${ids.c2}',2);
 insert into public.rifa_numeros values('${ids.c1}',1,'reservado',false,5,'Pessoa A',null),('${ids.c1}',2,'vendido',true,5,'Pessoa B',null),('${ids.c2}',1,'vendido',true,7,'Pessoa B',null);
 `);
 const snapshot=(await db.query('select * from public.rifa_numeros order by campanha_id,numero')).rows;
 await db.exec(fs.readFileSync('supabase/migrations/20261026_etapa3_acesso.sql','utf8'));
 assert.deepEqual((await db.query('select * from public.rifa_numeros order by campanha_id,numero')).rows,snapshot);
 await db.exec(`insert into auth.users(id,email) values('${ids.a}','usuario_a@rifa-deixa-vim.invalid'),('${ids.b}','usuario_b@rifa-deixa-vim.invalid')`);
 assert.equal((await db.query('select count(*)::integer as n from public.rifa_usuarios')).rows[0].n,2);
 await assert.rejects(()=>db.exec("insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000004','usuario_a@rifa-deixa-vim.invalid')"),e=>e.code==='23505');
 await assert.rejects(()=>db.exec("insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000004','padrao@rifa-deixa-vim.invalid')"),e=>e.code==='22023');
 await assert.rejects(()=>db.query('update auth.users set email=$1 where id=$2',['outro@rifa-deixa-vim.invalid',ids.a]),e=>e.code==='22023');
 async function role(name,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+name)}
 async function denied(sql,params=[]){await assert.rejects(()=>db.query(sql,params),e=>e.code==='42501')}
 async function own(c){return (await db.query('select * from public.rifa_minhas_participacoes($1)',[c])).rows}
 const link='select public.rifa_vincular_acesso_numero($1,$2,$3)';
 await role('anon');await denied('select * from public.rifa_usuarios');await denied('select * from public.rifa_acessos_numeros');await denied('select * from public.rifa_minhas_participacoes($1)',[ids.c1]);
 await role('authenticated',ids.a);assert.equal((await db.query('select * from public.rifa_usuarios')).rows.length,1);assert.equal((await own(ids.c1)).length,0);await denied(link,[ids.c1,1,'usuario_a']);await denied('select public.rifa_conta_numero($1,1)',[ids.c1]);
 await denied(`insert into public.rifa_acessos_numeros values('${ids.c1}',1,'${ids.a}',now())`);
 await role('authenticated',ids.admin);await db.query(link,[ids.c1,1,'usuario_a']);await db.query(link,[ids.c2,1,'usuario_b']);
 await role('authenticated',ids.a);assert.equal((await own(ids.c1)).length,1);assert.equal((await own(ids.c2)).length,0);
 assert.deepEqual(Object.keys((await own(ids.c1))[0]).sort(),['numero','pago','situacao','valor']);
 assert.equal((await db.query('select * from public.rifa_acessos_numeros')).rows.length,1);
 await role('authenticated',ids.b);assert.equal((await own(ids.c1)).length,0);assert.equal((await own(ids.c2)).length,1);
 await role('authenticated',ids.admin);await db.query(link,[ids.c1,1,'usuario_b']);
 await role('authenticated',ids.a);assert.equal((await own(ids.c1)).length,0);
 await role('authenticated',ids.b);assert.equal((await own(ids.c1)).length,1);
 await db.exec('reset role');await db.query("update public.rifa_numeros set situacao='vendido',pago=true where campanha_id=$1 and numero=1",[ids.c1]);
 await role('authenticated',ids.b);assert.equal((await own(ids.c1)).length,1);
 await db.exec('reset role');await db.query("update public.rifa_numeros set comprador='Outra pessoa' where campanha_id=$1 and numero=1",[ids.c1]);
 await role('authenticated',ids.b);assert.equal((await own(ids.c1)).length,0);
 await role('authenticated',ids.admin);await db.query(link,[ids.c1,1,'usuario_b']);
 await db.exec('reset role');await db.query("update public.rifa_numeros set situacao='disponivel',comprador=null where campanha_id=$1 and numero=1",[ids.c1]);
 await role('authenticated',ids.b);assert.equal((await own(ids.c1)).length,0);
 await role('authenticated',ids.admin);await assert.rejects(()=>db.query(link,[ids.c1,1,'usuario_a']),e=>e.code==='22023');
 await db.query(link,[ids.c2,1,null]);
 await role('authenticated',ids.b);assert.equal((await own(ids.c2)).length,0);
 console.log('PASS: PostgreSQL isolado — migração preserva bilhetes; RLS de visitante/usuário/admin; nenhuma autoatribuição; isolamento de contas/campanhas; revogação no desvínculo, liberação ou troca de pessoa; pagamento preserva acesso');
}finally{await db.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
