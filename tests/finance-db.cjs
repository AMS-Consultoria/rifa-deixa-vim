const fs=require('fs'),assert=require('assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE);
(async()=>{
 const db=new PGlite();
 try{
  const a='00000000-0000-4000-8000-000000000101',b='00000000-0000-4000-8000-000000000102';
  await db.exec("create role anon nologin; create role authenticated nologin; create table public.rifa_configuracoes(campanha_id uuid primary key,valor_bilhete numeric); create table public.rifa_numeros(campanha_id uuid,numero integer,situacao text,pago boolean,valor numeric);");
  await db.query('insert into public.rifa_configuracoes values($1,5),($2,9)',[a,b]);
  await db.query("insert into public.rifa_numeros values($1,1,'vendido',true,5),($1,2,'reservado',false,8),($1,3,'reservado',false,null),($1,4,'disponivel',false,5),($2,1,'vendido',true,9),($2,2,'reservado',false,11)",[a,b]);
  const before=(await db.query('select * from public.rifa_numeros order by campanha_id,numero')).rows;
  await db.exec(fs.readFileSync('supabase/migrations/20261027_etapa6_resumo_financeiro.sql','utf8'));
  await db.exec('set role anon');
  const one=(await db.query('select * from public.rifa_resumo_financeiro_publico($1)',[a])).rows[0];
  assert.deepEqual([Number(one.total_recebido),Number(one.total_a_receber),Number(one.total_geral)],[5,13,18]);
  const two=(await db.query('select * from public.rifa_resumo_financeiro_publico($1)',[b])).rows[0];
  assert.deepEqual([Number(two.total_recebido),Number(two.total_a_receber),Number(two.total_geral)],[9,11,20]);
  const none=(await db.query('select * from public.rifa_resumo_financeiro_publico($1)',['00000000-0000-4000-8000-000000000103'])).rows[0];
  assert.deepEqual([Number(none.total_recebido),Number(none.total_a_receber),Number(none.total_geral)],[0,0,0]);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select * from public.rifa_numeros order by campanha_id,numero')).rows,before);
  console.log('PASS Etapa 6: valores reais pagos/pendentes, campanhas isoladas, acesso anônimo agregado e dados preservados');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
