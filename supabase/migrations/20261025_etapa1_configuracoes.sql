-- ETAPA 1: revisar e aplicar somente após autorização. Não executado pelo aplicativo.
-- Pré-requisitos: public.rifa_numeros e public.rifa_administradores já existentes.
begin;

-- O esquema atual limita numero a 100; ampliar sem tocar nos registros.
alter table public.rifa_numeros drop constraint rifa_numeros_numero_check;
alter table public.rifa_numeros add constraint rifa_numeros_numero_check
  check (numero between 1 and 10000);

create table if not exists public.rifa_configuracoes (
  id integer primary key check (id = 1),
  nome_entidade text not null check (length(btrim(nome_entidade)) between 1 and 120),
  nome_campanha text not null check (length(btrim(nome_campanha)) between 1 and 120),
  nome_rifa text not null check (length(btrim(nome_rifa)) between 1 and 120),
  descricao_premio text not null check (length(btrim(descricao_premio)) between 1 and 240),
  quantidade_bilhetes integer not null check (quantidade_bilhetes between 1 and 10000),
  valor_bilhete numeric(10,2) not null check (valor_bilhete between 0.01 and 999999.99),
  criterio_sorteio text not null check (length(btrim(criterio_sorteio)) between 1 and 500),
  situacao text not null check (situacao in ('em_andamento','encerrada','sorteada')),
  atualizado_em timestamptz not null default now()
);

insert into public.rifa_configuracoes
  (id,nome_entidade,nome_campanha,nome_rifa,descricao_premio,
   quantidade_bilhetes,valor_bilhete,criterio_sorteio,situacao)
values
  (1,'Deixa Vim','Campanha 01','Rifa Deixa Vim','Agasalho esportivo',
   100,5,'Sorteio após todos os números serem preenchidos','em_andamento')
on conflict (id) do nothing;

alter table public.rifa_configuracoes enable row level security;
revoke all on public.rifa_configuracoes from public, anon, authenticated;
grant select on public.rifa_configuracoes to anon, authenticated;
drop policy if exists rifa_configuracoes_leitura on public.rifa_configuracoes;
create policy rifa_configuracoes_leitura on public.rifa_configuracoes
  for select to anon, authenticated using (id = 1);

create or replace function public.rifa_salvar_configuracoes(
  p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer,
  p_valor_bilhete numeric, p_criterio_sorteio text, p_situacao text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_anterior integer;
  v_maior_ocupado integer;
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

  -- Bloqueia alterações simultâneas nos bilhetes durante a verificação.
  lock table public.rifa_numeros in share row exclusive mode;
  select quantidade_bilhetes into v_anterior
    from public.rifa_configuracoes where id = 1 for update;
  if v_anterior is null then
    raise exception 'Configuração inicial não encontrada';
  end if;
  select coalesce(max(numero),0) into v_maior_ocupado
    from public.rifa_numeros where situacao <> 'disponivel';
  if p_quantidade_bilhetes < v_maior_ocupado then
    raise exception 'A quantidade ocultaria bilhetes vendidos ou reservados';
  end if;

  -- Reaproveita bilhetes disponíveis anteriormente ocultos e cria os novos.
  insert into public.rifa_numeros
    (numero,situacao,comprador,telefone,pago,valor,atualizado_em)
  select n,'disponivel',null,null,false,p_valor_bilhete,now()
    from generate_series(1,p_quantidade_bilhetes) as n
  on conflict (numero) do nothing;

  update public.rifa_configuracoes set
    nome_entidade = btrim(p_nome_entidade),
    nome_campanha = btrim(p_nome_campanha),
    nome_rifa = btrim(p_nome_rifa),
    descricao_premio = btrim(p_descricao_premio),
    quantidade_bilhetes = p_quantidade_bilhetes,
    valor_bilhete = p_valor_bilhete,
    criterio_sorteio = btrim(p_criterio_sorteio),
    situacao = p_situacao,
    atualizado_em = now()
  where id = 1;
end;
$$;
revoke all on function public.rifa_salvar_configuracoes(text,text,text,text,integer,numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_salvar_configuracoes(text,text,text,text,integer,numeric,text,text)
  to authenticated;

create or replace function public.rifa_estado_publico()
returns table (numero integer, situacao text, total_recebido numeric)
language sql stable security definer set search_path = ''
as $$
  select n.numero::integer, n.situacao::text,
    coalesce((select sum(v.valor) from public.rifa_numeros v
      where v.situacao = 'vendido' and v.numero <= c.quantidade_bilhetes),0)::numeric
  from public.rifa_numeros n
  cross join public.rifa_configuracoes c
  where c.id = 1 and n.numero between 1 and c.quantidade_bilhetes
  order by n.numero;
$$;
revoke all on function public.rifa_estado_publico() from public, anon, authenticated;
grant execute on function public.rifa_estado_publico() to anon, authenticated;

commit;
