-- Etapa 5: vários números por participante, pagamentos em lote e proteções.
-- Não executar no Supabase sem aprovação explícita.
begin;

create or replace function public.rifa_etapa5_validar_selecao(p_campanha_id uuid,p_numeros integer[])
returns integer language plpgsql security definer set search_path=''
as $$
declare v_quantidade integer; v_contagem integer; v_distintos integer;
begin
  if auth.uid() is null or not exists(select 1 from public.rifa_administradores where user_id=auth.uid()) then
    raise exception 'Acesso administrativo necessário' using errcode='42501';
  end if;
  if p_campanha_id is null or p_numeros is null or cardinality(p_numeros) not between 1 and 10000
    or array_position(p_numeros,null) is not null then
    raise exception 'Selecione ao menos um número válido.' using errcode='22023';
  end if;
  select count(distinct n) into v_distintos from unnest(p_numeros) as selecionado(n);
  if v_distintos<>cardinality(p_numeros) then
    raise exception 'A seleção contém números repetidos.' using errcode='22023';
  end if;
  select quantidade_bilhetes into v_quantidade from public.rifa_configuracoes where campanha_id=p_campanha_id;
  if not found then raise exception 'Campanha não encontrada.' using errcode='22023'; end if;
  if exists(select 1 from unnest(p_numeros) as selecionado(n) where n<1 or n>v_quantidade) then
    raise exception 'Um número selecionado não pertence à campanha.' using errcode='22023';
  end if;
  perform 1 from public.rifa_numeros n
    where n.campanha_id=p_campanha_id and n.numero=any(p_numeros)
    order by n.numero for update;
  get diagnostics v_contagem=row_count;
  if v_contagem<>cardinality(p_numeros) then
    raise exception 'Um ou mais números não foram encontrados. Atualize a campanha.' using errcode='40001';
  end if;
  return v_quantidade;
end;
$$;
revoke all on function public.rifa_etapa5_validar_selecao(uuid,integer[]) from public,anon,authenticated;

create or replace function public.rifa_reservar_numeros_lote(
  p_campanha_id uuid,p_numeros integer[],p_situacao text,p_nome text,p_telefone text,
  p_participante_id uuid,p_confirmar_homonimo boolean
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_quantidade integer; v_contagem integer; v_preco numeric; v_nome text:=btrim(coalesce(p_nome,''));
  v_telefone text:=nullif(btrim(coalesce(p_telefone,'')), ''); v_norm text; v_telefone_norm text;
  v_participante_id uuid; v_participante public.rifa_participantes%rowtype; v_candidatos jsonb;
begin
  v_quantidade:=public.rifa_etapa5_validar_selecao(p_campanha_id,p_numeros);
  if p_situacao is null or p_situacao not in ('reservado','vendido') then raise exception 'Situação inválida.' using errcode='22023'; end if;
  if exists(select 1 from public.rifa_numeros n where n.campanha_id=p_campanha_id and n.numero=any(p_numeros) and n.situacao<>'disponivel') then
    raise exception 'Um ou mais números já foram ocupados. Atualize a tela; nenhuma alteração foi feita.' using errcode='40001';
  end if;
  if exists(select 1 from public.rifa_sorteios s where s.campanha_id=p_campanha_id and s.numero=any(p_numeros)) then
    raise exception 'Um ou mais números constam do histórico de sorteios e não podem ser alterados.' using errcode='22023';
  end if;
  select valor_bilhete into v_preco from public.rifa_configuracoes where campanha_id=p_campanha_id;
  if p_participante_id is not null then
    select * into v_participante from public.rifa_participantes where id=p_participante_id for share;
    if not found then raise exception 'Participante selecionado não existe.' using errcode='22023'; end if;
    v_norm:=public.rifa_normalizar_nome(v_nome);
    if v_nome='' or v_participante.nome_normalizado<>v_norm then raise exception 'Participante selecionado inválido.' using errcode='22023'; end if;
    v_participante_id:=v_participante.id;
  else
    if length(v_nome) not between 1 and 100 or length(coalesce(v_telefone,''))>30 then
      raise exception 'Informe o nome completo e um telefone válido.' using errcode='22023';
    end if;
    v_norm:=public.rifa_normalizar_nome(v_nome);
    v_telefone_norm:=public.rifa_normalizar_telefone(v_telefone);
    perform pg_advisory_xact_lock(hashtextextended(v_norm,73142));
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome_completo',nome_completo,'telefone',telefone,'criado_em',criado_em) order by criado_em,id),'[]'::jsonb)
      into v_candidatos from public.rifa_participantes where nome_normalizado=v_norm;
    if jsonb_array_length(v_candidatos)>0 and not coalesce(p_confirmar_homonimo,false) then
      return jsonb_build_object('status','duplicado','candidatos',v_candidatos);
    end if;
    insert into public.rifa_participantes(nome_completo,nome_normalizado,telefone,telefone_normalizado)
      values(v_nome,v_norm,v_telefone,v_telefone_norm) returning id into v_participante_id;
    select * into v_participante from public.rifa_participantes where id=v_participante_id;
  end if;
  update public.rifa_numeros set situacao=p_situacao,comprador=v_participante.nome_completo,
    telefone=v_participante.telefone,pago=(p_situacao='vendido'),participante_id=v_participante_id,
    valor=v_preco,atualizado_em=now()
    where campanha_id=p_campanha_id and numero=any(p_numeros);
  return jsonb_build_object('status','salvo','participante_id',v_participante_id,'quantidade',cardinality(p_numeros));
end;
$$;
revoke all on function public.rifa_reservar_numeros_lote(uuid,integer[],text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.rifa_reservar_numeros_lote(uuid,integer[],text,text,text,uuid,boolean) to authenticated;

create or replace function public.rifa_confirmar_pagamento_lote(p_campanha_id uuid,p_numeros integer[])
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_contagem integer; v_participante_id uuid;
begin
  perform public.rifa_etapa5_validar_selecao(p_campanha_id,p_numeros);
  if exists(select 1 from public.rifa_sorteios s where s.campanha_id=p_campanha_id and s.numero=any(p_numeros)) then
    raise exception 'Um ou mais números constam do histórico de sorteios e estão protegidos.' using errcode='22023';
  end if;
  if exists(select 1 from public.rifa_numeros n where n.campanha_id=p_campanha_id and n.numero=any(p_numeros)
      and (n.situacao<>'reservado' or n.pago or n.participante_id is null)) then
    raise exception 'Somente reservas pendentes podem ser confirmadas. Nenhuma alteração foi feita.' using errcode='22023';
  end if;
  select count(distinct participante_id) into v_contagem from public.rifa_numeros
    where campanha_id=p_campanha_id and numero=any(p_numeros);
  if v_contagem<>1 then raise exception 'Selecione reservas de um único participante.' using errcode='22023'; end if;
  select participante_id into v_participante_id from public.rifa_numeros
    where campanha_id=p_campanha_id and numero=any(p_numeros) order by numero limit 1;
  update public.rifa_numeros set situacao='vendido',pago=true,atualizado_em=now()
    where campanha_id=p_campanha_id and numero=any(p_numeros);
  return jsonb_build_object('status','salvo','participante_id',v_participante_id,'quantidade',cardinality(p_numeros));
end;
$$;
revoke all on function public.rifa_confirmar_pagamento_lote(uuid,integer[]) from public,anon,authenticated;
grant execute on function public.rifa_confirmar_pagamento_lote(uuid,integer[]) to authenticated;

create or replace function public.rifa_liberar_reservas_lote(p_campanha_id uuid,p_numeros integer[])
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_contagem integer; v_participante_id uuid;
begin
  perform public.rifa_etapa5_validar_selecao(p_campanha_id,p_numeros);
  if exists(select 1 from public.rifa_sorteios s where s.campanha_id=p_campanha_id and s.numero=any(p_numeros)) then
    raise exception 'Um ou mais números constam do histórico de sorteios e estão protegidos.' using errcode='22023';
  end if;
  if exists(select 1 from public.rifa_numeros n where n.campanha_id=p_campanha_id and n.numero=any(p_numeros)
      and (n.situacao<>'reservado' or n.pago or n.participante_id is null)) then
    raise exception 'Somente reservas não pagas podem ser liberadas. Números pagos ou ocupados não foram alterados.' using errcode='22023';
  end if;
  select count(distinct participante_id) into v_contagem from public.rifa_numeros
    where campanha_id=p_campanha_id and numero=any(p_numeros);
  if v_contagem<>1 then raise exception 'Selecione reservas de um único participante.' using errcode='22023'; end if;
  select participante_id into v_participante_id from public.rifa_numeros
    where campanha_id=p_campanha_id and numero=any(p_numeros) order by numero limit 1;
  update public.rifa_numeros set situacao='disponivel',pago=false,comprador=null,telefone=null,
    participante_id=null,atualizado_em=now()
    where campanha_id=p_campanha_id and numero=any(p_numeros);
  return jsonb_build_object('status','salvo','participante_id',v_participante_id,'quantidade',cardinality(p_numeros));
end;
$$;
revoke all on function public.rifa_liberar_reservas_lote(uuid,integer[]) from public,anon,authenticated;
grant execute on function public.rifa_liberar_reservas_lote(uuid,integer[]) to authenticated;

-- Protege pagamento, identidade e preço de bilhetes pagos e de números presentes no histórico.
create or replace function public.rifa_proteger_numero_etapa5()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_sorteado boolean;
begin
  select exists(select 1 from public.rifa_sorteios s where s.campanha_id=old.campanha_id and s.numero=old.numero) into v_sorteado;
  if TG_OP='DELETE' then
    if old.pago or v_sorteado then raise exception 'Número pago ou registrado em sorteio não pode ser removido.' using errcode='23514'; end if;
    return old;
  end if;
  if (old.pago or v_sorteado) and (
      new.campanha_id is distinct from old.campanha_id or new.numero is distinct from old.numero
      or new.situacao is distinct from old.situacao or new.pago is distinct from old.pago
      or new.comprador is distinct from old.comprador or new.telefone is distinct from old.telefone
      or new.participante_id is distinct from old.participante_id or new.valor is distinct from old.valor) then
    if old.pago then raise exception 'Número pago protegido contra alteração.' using errcode='23514';
    else raise exception 'Número registrado em sorteio protegido contra alteração.' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.rifa_proteger_numero_etapa5() from public,anon,authenticated;
drop trigger if exists rifa_proteger_numero_etapa5 on public.rifa_numeros;
drop trigger if exists rifa_proteger_numero_pago_exclusao_etapa5 on public.rifa_numeros;
create trigger rifa_proteger_numero_etapa5
before update of campanha_id,numero,situacao,pago,comprador,telefone,participante_id,valor on public.rifa_numeros
for each row execute function public.rifa_proteger_numero_etapa5();
create trigger rifa_proteger_numero_pago_exclusao_etapa5
before delete on public.rifa_numeros
for each row execute function public.rifa_proteger_numero_etapa5();

commit;
