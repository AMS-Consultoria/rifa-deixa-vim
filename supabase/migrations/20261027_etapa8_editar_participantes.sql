-- Etapa 8: edição protegida dos dados do participante.
-- Não altera estruturas nem registros até que um administrador edite uma ficha.
begin;

create or replace function public.rifa_editar_participante(
  p_participante_id uuid,
  p_nome text,
  p_telefone text,
  p_confirmar_homonimo boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_participante public.rifa_participantes%rowtype;
  v_nome text := btrim(coalesce(p_nome,''));
  v_telefone text := nullif(btrim(coalesce(p_telefone,'')), '');
  v_nome_normalizado text;
  v_telefone_normalizado text;
  v_candidatos jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id=auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  if p_participante_id is null or length(v_nome) not between 1 and 100
    or length(coalesce(v_telefone,''))>30 then
    raise exception 'Informe um nome de 1 a 100 caracteres e um telefone de até 30 caracteres.' using errcode='22023';
  end if;

  v_nome_normalizado := public.rifa_normalizar_nome(v_nome);
  v_telefone_normalizado := public.rifa_normalizar_telefone(v_telefone);
  if v_nome_normalizado='' then
    raise exception 'Informe o nome do participante.' using errcode='22023';
  end if;

  -- O cadastro canônico coordena a atribuição de novos números. Alterações
  -- concorrentes de pagamento continuam protegidas pelo gatilho Etapa 5: se
  -- um bilhete ficar pago antes da sincronização, o gatilho aborta a transação.
  perform pg_advisory_xact_lock(hashtextextended(v_nome_normalizado,73142));

  select * into v_participante
    from public.rifa_participantes p
    where p.id=p_participante_id
    for update;
  if not found then
    raise exception 'Participante não encontrado.' using errcode='22023';
  end if;

  -- Mudança apenas de telefone/acento/caixa não deve exigir confirmação de
  -- homônimo quando o nome normalizado já era o mesmo.
  if v_nome_normalizado is distinct from v_participante.nome_normalizado then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,'nome_completo',p.nome_completo,'telefone',p.telefone,'criado_em',p.criado_em
    ) order by p.criado_em,p.id),'[]'::jsonb)
    into v_candidatos
    from public.rifa_participantes p
    where p.nome_normalizado=v_nome_normalizado and p.id<>p_participante_id;

    if jsonb_array_length(v_candidatos)>0 and not coalesce(p_confirmar_homonimo,false) then
      return jsonb_build_object('status','duplicado','candidatos',v_candidatos);
    end if;
  end if;

  -- O gatilho Etapa 5 rejeita qualquer mudança de identidade em bilhete
  -- pago ou sorteado. A subtransação reverte o cadastro canônico junto com as
  -- cópias dos bilhetes se uma venda concorrente vencer a edição.
  begin
    update public.rifa_participantes
      set nome_completo=v_nome,
          nome_normalizado=v_nome_normalizado,
          telefone=v_telefone,
          telefone_normalizado=v_telefone_normalizado
      where id=p_participante_id;

    update public.rifa_numeros
      set comprador=v_nome,telefone=v_telefone
      where participante_id=p_participante_id;
  exception when check_violation then
    return jsonb_build_object('status','protegido');
  end;

  return jsonb_build_object('status','salvo','participante_id',p_participante_id);
end;
$$;

revoke all on function public.rifa_editar_participante(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.rifa_editar_participante(uuid,text,text,boolean) to authenticated;

commit;