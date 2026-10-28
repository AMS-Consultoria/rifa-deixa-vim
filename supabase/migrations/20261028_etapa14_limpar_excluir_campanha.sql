-- Etapa 14: operações administrativas explícitas para limpar ou excluir uma campanha.
-- Aplicar manualmente no Supabase SQL Editor. Não apaga contas administrativas.
begin;

drop policy if exists rifa_premio_admin_excluir on storage.objects;
create policy rifa_premio_admin_excluir on storage.objects for delete to authenticated
using (
  bucket_id = 'rifa-premios'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/premio$'
  and exists (select 1 from public.rifa_administradores a where a.user_id = auth.uid())
);

create or replace function public.rifa_limpar_dados_campanha(
  p_campanha_id uuid,
  p_confirmacao text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_config public.rifa_configuracoes%rowtype;
  v_bilhetes integer;
  v_sorteios integer;
  v_participantes integer;
  v_participante_ids uuid[] := array[]::uuid[];
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_campanha_id is null then
    raise exception 'Campanha não informada' using errcode = '22023';
  end if;

  lock table public.rifa_numeros in share row exclusive mode;
  lock table public.rifa_sorteios in share row exclusive mode;
  lock table public.rifa_acessos_numeros in share row exclusive mode;
  select * into v_config from public.rifa_configuracoes
    where campanha_id = p_campanha_id for update;
  if not found then
    raise exception 'Campanha não encontrada' using errcode = '22023';
  end if;
  if p_confirmacao is distinct from v_config.nome_campanha then
    raise exception 'O nome digitado não corresponde à campanha selecionada' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct participante_id), array[]::uuid[])
    into v_participante_ids
  from public.rifa_numeros
  where campanha_id = p_campanha_id and participante_id is not null;

  delete from public.rifa_acessos_numeros where campanha_id = p_campanha_id;
  delete from public.rifa_sorteios where campanha_id = p_campanha_id;
  get diagnostics v_sorteios = row_count;

  update public.rifa_numeros set
    situacao = 'disponivel', comprador = null, telefone = null,
    participante_id = null, pago = false, valor = v_config.valor_bilhete,
    atualizado_em = now()
  where campanha_id = p_campanha_id;
  get diagnostics v_bilhetes = row_count;

  delete from public.rifa_participantes p
  where p.id = any(v_participante_ids) and not exists (
    select 1 from public.rifa_numeros n where n.participante_id = p.id
  );
  get diagnostics v_participantes = row_count;

  return jsonb_build_object(
    'status','limpo','bilhetes_reiniciados',v_bilhetes,
    'sorteios_removidos',v_sorteios,'participantes_orfaos_removidos',v_participantes
  );
end;
$$;
revoke all on function public.rifa_limpar_dados_campanha(uuid,text) from public, anon, authenticated;
grant execute on function public.rifa_limpar_dados_campanha(uuid,text) to authenticated;

create or replace function public.rifa_excluir_campanha(
  p_campanha_id uuid,
  p_confirmacao text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_nome text;
  v_tem_outra boolean;
  v_bilhetes integer;
  v_sorteios integer;
  v_participante_ids uuid[] := array[]::uuid[];
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_campanha_id is null then
    raise exception 'Campanha não informada' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(73142);
  lock table public.rifa_numeros in share row exclusive mode;
  lock table public.rifa_sorteios in share row exclusive mode;
  lock table public.rifa_acessos_numeros in share row exclusive mode;
  select nome_campanha into v_nome from public.rifa_configuracoes
    where campanha_id = p_campanha_id for update;
  if not found then
    raise exception 'Campanha não encontrada' using errcode = '22023';
  end if;
  if p_confirmacao is distinct from v_nome then
    raise exception 'O nome digitado não corresponde à campanha selecionada' using errcode = '22023';
  end if;
  select exists(select 1 from public.rifa_campanhas where id <> p_campanha_id) into v_tem_outra;
  if not v_tem_outra then
    raise exception 'Mantenha ao menos uma campanha cadastrada' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct participante_id), array[]::uuid[])
    into v_participante_ids
  from public.rifa_numeros
  where campanha_id = p_campanha_id and participante_id is not null;

  delete from public.rifa_acessos_numeros where campanha_id = p_campanha_id;
  delete from public.rifa_sorteios where campanha_id = p_campanha_id;
  get diagnostics v_sorteios = row_count;
  delete from public.rifa_numeros where campanha_id = p_campanha_id;
  get diagnostics v_bilhetes = row_count;
  delete from public.rifa_dados_campanha_admin where campanha_id = p_campanha_id;
  delete from public.rifa_configuracoes where campanha_id = p_campanha_id;
  delete from public.rifa_campanhas where id = p_campanha_id;

  delete from public.rifa_participantes p
  where p.id = any(v_participante_ids) and not exists (
    select 1 from public.rifa_numeros n where n.participante_id = p.id
  );

  return jsonb_build_object(
    'status','excluida','bilhetes_removidos',v_bilhetes,'sorteios_removidos',v_sorteios
  );
end;
$$;
revoke all on function public.rifa_excluir_campanha(uuid,text) from public, anon, authenticated;
grant execute on function public.rifa_excluir_campanha(uuid,text) to authenticated;

commit;
