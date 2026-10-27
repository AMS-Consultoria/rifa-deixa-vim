create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth,public to anon,authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key);
create table public.rifa_administradores(user_id uuid primary key references auth.users(id));
alter table public.rifa_administradores enable row level security;
grant select on public.rifa_administradores to authenticated;
create policy admin_self on public.rifa_administradores for select to authenticated using(user_id=auth.uid());
create table public.rifa_campanhas(id uuid primary key,codigo integer unique not null);
create table public.rifa_configuracoes(
 id integer primary key,campanha_id uuid unique references public.rifa_campanhas(id),
 nome_entidade text not null,nome_campanha text not null,nome_rifa text not null,
 descricao_premio text not null,quantidade_bilhetes integer not null,valor_bilhete numeric not null,
 criterio_sorteio text not null,situacao text not null,atualizado_em timestamptz default now()
);
grant select on public.rifa_configuracoes to anon,authenticated;
create table public.rifa_numeros(
 campanha_id uuid not null,numero integer not null,situacao text not null,
 comprador text,telefone text,pago boolean not null default false,valor numeric not null,
 atualizado_em timestamptz default now(),primary key(campanha_id,numero)
);
create table public.rifa_sorteios(
 id uuid primary key,campanha_id uuid not null references public.rifa_campanhas(id),
 numero integer not null,modalidade text not null,situacao text not null,ganhador text,
 participantes integer not null,realizado_em timestamptz not null default now(),criado_por uuid
);
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.rifa_administradores values('00000000-0000-4000-8000-000000000001');
insert into public.rifa_campanhas values
 ('00000000-0000-4000-8000-000000000101',1),('00000000-0000-4000-8000-000000000102',2);
insert into public.rifa_configuracoes(id,campanha_id,nome_entidade,nome_campanha,nome_rifa,descricao_premio,quantidade_bilhetes,valor_bilhete,criterio_sorteio,situacao)
values
 (1,'00000000-0000-4000-8000-000000000101','Deixa Vim','Campanha Um','Rifa Um','Prêmio',5,5,'Sorteio divulgado','em_andamento'),
 (2,'00000000-0000-4000-8000-000000000102','Deixa Vim','Campanha Dois','Rifa Dois','Prêmio 2',5,7,'Sorteio divulgado','em_andamento');
insert into public.rifa_numeros(campanha_id,numero,situacao,comprador,telefone,pago,valor)
select c.id,n,
 case when c.id='00000000-0000-4000-8000-000000000101' and n=1 then 'reservado'
      when c.id='00000000-0000-4000-8000-000000000101' and n=2 then 'vendido'
      when c.id='00000000-0000-4000-8000-000000000102' and n=1 then 'vendido'
      else 'disponivel' end,
 case when c.id='00000000-0000-4000-8000-000000000101' and n=1 then 'Atual Reservado'
      when c.id='00000000-0000-4000-8000-000000000101' and n=2 then 'Atual Pago'
      when c.id='00000000-0000-4000-8000-000000000102' and n=1 then 'Outra Campanha' end,
 case when c.id='00000000-0000-4000-8000-000000000101' and n=1 then '11911111111'
      when c.id='00000000-0000-4000-8000-000000000101' and n=2 then '11922222222'
      when c.id='00000000-0000-4000-8000-000000000102' and n=1 then '11933333333' end,
 (c.id='00000000-0000-4000-8000-000000000101' and n=2) or
 (c.id='00000000-0000-4000-8000-000000000102' and n=1),
 case when c.id='00000000-0000-4000-8000-000000000101' then 5 else 7 end
from unnest(array['00000000-0000-4000-8000-000000000101'::uuid,'00000000-0000-4000-8000-000000000102'::uuid]) c(id)
cross join generate_series(1,5) n;
insert into public.rifa_sorteios(id,campanha_id,numero,modalidade,situacao,participantes,realizado_em)
values('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101',3,'todos','disponivel',5,now());
create function public.rifa_salvar_configuracoes_campanha(
 p_campanha_id uuid,p_nome_entidade text,p_nome_campanha text,p_nome_rifa text,
 p_descricao_premio text,p_quantidade_bilhetes integer,p_valor_bilhete numeric,
 p_criterio_sorteio text,p_situacao text
) returns void language plpgsql security definer set search_path=''
as $$
declare v_max integer;
begin
 if auth.uid() is null or not exists(select 1 from public.rifa_administradores where user_id=auth.uid()) then
   raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 select coalesce(max(numero),0) into v_max from public.rifa_numeros where campanha_id=p_campanha_id and situacao<>'disponivel';
 if p_quantidade_bilhetes<v_max then raise exception 'A quantidade ocultaria bilhetes vendidos ou reservados'; end if;
 update public.rifa_configuracoes set nome_entidade=p_nome_entidade,nome_campanha=p_nome_campanha,
  nome_rifa=p_nome_rifa,descricao_premio=p_descricao_premio,quantidade_bilhetes=p_quantidade_bilhetes,
  valor_bilhete=p_valor_bilhete,criterio_sorteio=p_criterio_sorteio,situacao=p_situacao,atualizado_em=now()
  where campanha_id=p_campanha_id;
 insert into public.rifa_numeros(campanha_id,numero,situacao,pago,valor)
  select p_campanha_id,n,'disponivel',false,p_valor_bilhete from generate_series(1,p_quantidade_bilhetes) n
  on conflict(campanha_id,numero) do nothing;
end $$;
create function public.rifa_criar_campanha(
 p_nome_entidade text,p_nome_campanha text,p_nome_rifa text,p_descricao_premio text,
 p_quantidade_bilhetes integer,p_valor_bilhete numeric,p_criterio_sorteio text,p_situacao text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid:='00000000-0000-4000-8000-000000000103';
begin
 if auth.uid() is null or not exists(select 1 from public.rifa_administradores where user_id=auth.uid()) then
  raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 insert into public.rifa_campanhas values(v_id,3);
 insert into public.rifa_configuracoes(id,campanha_id,nome_entidade,nome_campanha,nome_rifa,descricao_premio,quantidade_bilhetes,valor_bilhete,criterio_sorteio,situacao)
  values(3,v_id,p_nome_entidade,p_nome_campanha,p_nome_rifa,p_descricao_premio,p_quantidade_bilhetes,p_valor_bilhete,p_criterio_sorteio,p_situacao);
 insert into public.rifa_numeros(campanha_id,numero,situacao,pago,valor)
  select v_id,n,'disponivel',false,p_valor_bilhete from generate_series(1,p_quantidade_bilhetes) n;
 return v_id;
end $$;
