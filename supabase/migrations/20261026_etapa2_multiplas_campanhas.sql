-- ETAPA 2 — preparar campanhas isoladas sem executar esta migração sem aprovação.
-- A transação mantém a Campanha 01 e vincula todos os registros existentes a ela.
begin;

do $$
begin
  if (select count(*) from public.rifa_configuracoes) <> 1
    or not exists (select 1 from public.rifa_configuracoes where id = 1) then
    raise exception 'A configuração original não está no formato esperado; interrompendo sem alterar dados';
  end if;
  if exists (
    select 1 from public.rifa_numeros n cross join public.rifa_configuracoes c
    where c.id = 1 and n.numero > c.quantidade_bilhetes and n.situacao <> 'disponivel'
  ) then
    raise exception 'Há bilhetes ocupados fora da quantidade configurada; interrompendo sem alterar dados';
  end if;  if exists (
    select 1 from public.rifa_configuracoes c
    where c.id = 1 and (select count(*) from public.rifa_numeros n
      where n.numero between 1 and c.quantidade_bilhetes) <> c.quantidade_bilhetes
  ) then
    raise exception 'A cartela não contém todos os números configurados; interrompendo sem alterar dados';
  end if;
end;
$$;

create table public.rifa_campanhas (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null unique,
  criada_em timestamptz not null default now()
);
create sequence public.rifa_campanhas_codigo_seq start with 2 increment by 1;
alter table public.rifa_campanhas alter column codigo
  set default nextval('public.rifa_campanhas_codigo_seq');
alter sequence public.rifa_campanhas_codigo_seq owned by public.rifa_campanhas.codigo;

alter table public.rifa_configuracoes add column campanha_id uuid;
alter table public.rifa_numeros add column campanha_id uuid;
alter table public.rifa_sorteios add column campanha_id uuid;

-- Vincular o estado atual sem alterar os valores de configuração, vendas ou sorteios.
do $$
declare
  v_campanha_id uuid;
begin
  insert into public.rifa_campanhas (codigo) values (1) returning id into v_campanha_id;
  update public.rifa_configuracoes set campanha_id = v_campanha_id where id = 1;
  update public.rifa_numeros set campanha_id = v_campanha_id;
  update public.rifa_sorteios set campanha_id = v_campanha_id;
end;
$$;

alter table public.rifa_configuracoes alter column campanha_id set not null;
alter table public.rifa_numeros alter column campanha_id set not null;
alter table public.rifa_sorteios alter column campanha_id set not null;
alter table public.rifa_configuracoes add constraint rifa_configuracoes_campanha_id_fkey
  foreign key (campanha_id) references public.rifa_campanhas(id) on delete restrict;
alter table public.rifa_configuracoes add constraint rifa_configuracoes_campanha_id_key unique (campanha_id);
alter table public.rifa_numeros add constraint rifa_numeros_campanha_id_fkey
  foreign key (campanha_id) references public.rifa_campanhas(id) on delete restrict;
alter table public.rifa_sorteios add constraint rifa_sorteios_campanha_id_fkey
  foreign key (campanha_id) references public.rifa_campanhas(id) on delete restrict;
create index rifa_sorteios_campanha_data_idx
  on public.rifa_sorteios (campanha_id, realizado_em desc);

-- Permitir repetir a numeração em campanhas distintas.
alter table public.rifa_numeros drop constraint rifa_numeros_pkey;
alter table public.rifa_numeros add constraint rifa_numeros_pkey primary key (campanha_id, numero);

-- As configurações passam a ter uma linha por campanha.
alter table public.rifa_configuracoes drop constraint rifa_configuracoes_id_check;
create sequence public.rifa_configuracoes_id_seq start with 2 increment by 1;
alter table public.rifa_configuracoes alter column id
  set default nextval('public.rifa_configuracoes_id_seq');
alter sequence public.rifa_configuracoes_id_seq owned by public.rifa_configuracoes.id;

-- O projeto já aceita até 10.000 bilhetes; alinhar as restrições do histórico.
alter table public.rifa_sorteios drop constraint rifa_sorteios_numero_check;
alter table public.rifa_sorteios drop constraint rifa_sorteios_participantes_check;
alter table public.rifa_sorteios add constraint rifa_sorteios_numero_check check (numero between 1 and 10000);
alter table public.rifa_sorteios add constraint rifa_sorteios_participantes_check check (participantes between 1 and 10000);

alter table public.rifa_campanhas enable row level security;
revoke all on public.rifa_campanhas from public, anon, authenticated;
grant select on public.rifa_campanhas to anon, authenticated;
drop policy if exists rifa_campanhas_leitura_publica on public.rifa_campanhas;
create policy rifa_campanhas_leitura_publica on public.rifa_campanhas
  for select to anon, authenticated using (true);

-- Os dados de configuração não contêm dados pessoais e alimentam o seletor público.
drop policy if exists rifa_configuracoes_leitura on public.rifa_configuracoes;
create policy rifa_configuracoes_leitura on public.rifa_configuracoes
  for select to anon, authenticated using (true);

create or replace function public.rifa_listar_campanhas_publicas()
returns table (
  id uuid, codigo integer, nome_entidade text, nome_campanha text, nome_rifa text,
  descricao_premio text, quantidade_bilhetes integer, valor_bilhete numeric,
  criterio_sorteio text, situacao text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.codigo, cfg.nome_entidade, cfg.nome_campanha, cfg.nome_rifa,
    cfg.descricao_premio, cfg.quantidade_bilhetes, cfg.valor_bilhete,
    cfg.criterio_sorteio, cfg.situacao
  from public.rifa_campanhas c
  join public.rifa_configuracoes cfg on cfg.campanha_id = c.id
  order by c.codigo;
$$;
revoke all on function public.rifa_listar_campanhas_publicas() from public, anon, authenticated;
grant execute on function public.rifa_listar_campanhas_publicas() to anon, authenticated;

create or replace function public.rifa_estado_publico(p_campanha_id uuid)
returns table (numero integer, situacao text, total_recebido numeric)
language sql stable security definer set search_path = ''
as $$
  select n.numero::integer, n.situacao::text,
    coalesce((select sum(v.valor) from public.rifa_numeros v
      where v.campanha_id = p_campanha_id and v.situacao = 'vendido'),0)::numeric
  from public.rifa_numeros n
  join public.rifa_configuracoes cfg on cfg.campanha_id = n.campanha_id
  where n.campanha_id = p_campanha_id and n.numero between 1 and cfg.quantidade_bilhetes
  order by n.numero;
$$;
revoke all on function public.rifa_estado_publico(uuid) from public, anon, authenticated;
grant execute on function public.rifa_estado_publico(uuid) to anon, authenticated;

-- Compatibilidade para a versão publicada antes da atualização do aplicativo.
create or replace function public.rifa_estado_publico()
returns table (numero integer, situacao text, total_recebido numeric)
language sql stable security definer set search_path = ''
as $$
  select * from public.rifa_estado_publico(
    (select id from public.rifa_campanhas where codigo = 1)
  );
$$;
revoke all on function public.rifa_estado_publico() from public, anon, authenticated;
grant execute on function public.rifa_estado_publico() to anon, authenticated;

create or replace function public.rifa_salvar_configuracoes_campanha(
  p_campanha_id uuid, p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer, p_valor_bilhete numeric,
  p_criterio_sorteio text, p_situacao text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_maior_ocupado integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores where user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_campanha_id is null or p_nome_entidade is null or length(btrim(p_nome_entidade)) not between 1 and 120
    or p_nome_campanha is null or length(btrim(p_nome_campanha)) not between 1 and 120
    or p_nome_rifa is null or length(btrim(p_nome_rifa)) not between 1 and 120
    or p_descricao_premio is null or length(btrim(p_descricao_premio)) not between 1 and 240
    or p_criterio_sorteio is null or length(btrim(p_criterio_sorteio)) not between 1 and 500
    or p_quantidade_bilhetes is null or p_quantidade_bilhetes not between 1 and 10000
    or p_valor_bilhete is null or p_valor_bilhete not between 0.01 and 999999.99
    or round(p_valor_bilhete, 2) <> p_valor_bilhete
    or p_situacao is null or p_situacao not in ('em_andamento','encerrada','sorteada') then
    raise exception 'Configurações inválidas' using errcode = '22023';
  end if;
  lock table public.rifa_numeros in share row exclusive mode;
  perform 1 from public.rifa_configuracoes where campanha_id = p_campanha_id for update;
  if not found then raise exception 'Campanha não encontrada'; end if;
  select coalesce(max(numero),0) into v_maior_ocupado from public.rifa_numeros
    where campanha_id = p_campanha_id and situacao <> 'disponivel';
  if p_quantidade_bilhetes < v_maior_ocupado then
    raise exception 'A quantidade ocultaria bilhetes vendidos ou reservados';
  end if;
  insert into public.rifa_numeros
    (campanha_id,numero,situacao,comprador,telefone,pago,valor,atualizado_em)
  select p_campanha_id,n,'disponivel',null,null,false,p_valor_bilhete,now()
    from generate_series(1,p_quantidade_bilhetes) as n
  on conflict (campanha_id,numero) do nothing;
  update public.rifa_configuracoes set
    nome_entidade=btrim(p_nome_entidade), nome_campanha=btrim(p_nome_campanha),
    nome_rifa=btrim(p_nome_rifa), descricao_premio=btrim(p_descricao_premio),
    quantidade_bilhetes=p_quantidade_bilhetes, valor_bilhete=p_valor_bilhete,
    criterio_sorteio=btrim(p_criterio_sorteio), situacao=p_situacao, atualizado_em=now()
  where campanha_id=p_campanha_id;
end;
$$;
revoke all on function public.rifa_salvar_configuracoes_campanha(uuid,text,text,text,text,integer,numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_salvar_configuracoes_campanha(uuid,text,text,text,text,integer,numeric,text,text)
  to authenticated;

create or replace function public.rifa_salvar_configuracoes(
  p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer,
  p_valor_bilhete numeric, p_criterio_sorteio text, p_situacao text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.rifa_salvar_configuracoes_campanha(
    (select id from public.rifa_campanhas where codigo=1),
    p_nome_entidade,p_nome_campanha,p_nome_rifa,p_descricao_premio,
    p_quantidade_bilhetes,p_valor_bilhete,p_criterio_sorteio,p_situacao
  );
end;
$$;
revoke all on function public.rifa_salvar_configuracoes(text,text,text,text,integer,numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_salvar_configuracoes(text,text,text,text,integer,numeric,text,text)
  to authenticated;

create or replace function public.rifa_criar_campanha(
  p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer,
  p_valor_bilhete numeric, p_criterio_sorteio text, p_situacao text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_config_id integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores where user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_nome_entidade is null or length(btrim(p_nome_entidade)) not between 1 and 120
    or p_nome_campanha is null or length(btrim(p_nome_campanha)) not between 1 and 120
    or p_nome_rifa is null or length(btrim(p_nome_rifa)) not between 1 and 120
    or p_descricao_premio is null or length(btrim(p_descricao_premio)) not between 1 and 240
    or p_criterio_sorteio is null or length(btrim(p_criterio_sorteio)) not between 1 and 500
    or p_quantidade_bilhetes is null or p_quantidade_bilhetes not between 1 and 10000
    or p_valor_bilhete is null or p_valor_bilhete not between 0.01 and 999999.99
    or round(p_valor_bilhete, 2) <> p_valor_bilhete
    or p_situacao is null or p_situacao not in ('em_andamento','encerrada','sorteada') then
    raise exception 'Configurações inválidas' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(73142);
  insert into public.rifa_campanhas (codigo)
    values (nextval('public.rifa_campanhas_codigo_seq')) returning id into v_id;
  v_config_id := nextval('public.rifa_configuracoes_id_seq');
  insert into public.rifa_configuracoes
    (id,campanha_id,nome_entidade,nome_campanha,nome_rifa,descricao_premio,
     quantidade_bilhetes,valor_bilhete,criterio_sorteio,situacao)
  values (v_config_id,v_id,btrim(p_nome_entidade),btrim(p_nome_campanha),btrim(p_nome_rifa),
     btrim(p_descricao_premio),p_quantidade_bilhetes,p_valor_bilhete,
     btrim(p_criterio_sorteio),p_situacao);
  insert into public.rifa_numeros
    (campanha_id,numero,situacao,comprador,telefone,pago,valor,atualizado_em)
  select v_id,n,'disponivel',null,null,false,p_valor_bilhete,now()
    from generate_series(1,p_quantidade_bilhetes) as n;
  return v_id;
end;
$$;
revoke all on function public.rifa_criar_campanha(text,text,text,text,integer,numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_criar_campanha(text,text,text,text,integer,numeric,text,text)
  to authenticated;

commit;