-- Etapa 9: dados privados da campanha e restauração segura de backup.
-- Revisar e aplicar no Supabase somente após aprovação explícita.
begin;

create table if not exists public.rifa_dados_campanha_admin (
  campanha_id uuid primary key references public.rifa_campanhas(id) on delete restrict,
  tipo_chave_pix text not null default '' check (tipo_chave_pix in ('','cpf_cnpj','email','telefone','aleatoria')),
  chave_pix text not null default '' check (length(chave_pix) <= 120),
  whatsapp text not null default '' check (length(whatsapp) <= 30),
  atualizado_em timestamptz not null default now()
);
alter table public.rifa_dados_campanha_admin enable row level security;
revoke all on public.rifa_dados_campanha_admin from public, anon, authenticated;

create or replace function public.rifa_obter_dados_campanha_admin(p_campanha_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_campanha_id is null or not exists (
    select 1 from public.rifa_campanhas c where c.id = p_campanha_id
  ) then
    raise exception 'Campanha não encontrada' using errcode = '22023';
  end if;
  select jsonb_build_object(
    'tipo_chave_pix', d.tipo_chave_pix, 'chave_pix', d.chave_pix,
    'whatsapp', d.whatsapp, 'atualizado_em', d.atualizado_em
  ) into v_result
  from public.rifa_dados_campanha_admin d where d.campanha_id = p_campanha_id;
  return coalesce(v_result, jsonb_build_object('tipo_chave_pix','','chave_pix','','whatsapp',''));
end;
$$;
revoke all on function public.rifa_obter_dados_campanha_admin(uuid) from public, anon, authenticated;
grant execute on function public.rifa_obter_dados_campanha_admin(uuid) to authenticated;

create or replace function public.rifa_validar_dados_campanha_admin(
  p_tipo_chave_pix text, p_chave_pix text, p_whatsapp text
) returns void language plpgsql immutable set search_path = ''
as $$
declare
  v_tipo text := coalesce(p_tipo_chave_pix,'');
  v_chave text := btrim(coalesce(p_chave_pix,''));
  v_whatsapp text := btrim(coalesce(p_whatsapp,''));
  v_digitos text;
begin
  if v_tipo not in ('','cpf_cnpj','email','telefone','aleatoria')
    or length(v_chave) > 120 or length(v_whatsapp) > 30 then
    raise exception 'Dados de pagamento inválidos' using errcode = '22023';
  end if;
  v_digitos := regexp_replace(v_chave, '[^0-9]', '', 'g');
  if v_chave <> '' and v_tipo = '' then
    raise exception 'Selecione o tipo da chave Pix' using errcode = '22023';
  elsif v_chave <> '' and v_tipo = 'cpf_cnpj' and length(v_digitos) not in (11,14) then
    raise exception 'A chave CPF/CNPJ deve conter 11 ou 14 dígitos' using errcode = '22023';
  elsif v_chave <> '' and v_tipo = 'email' and v_chave !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Informe um e-mail válido para a chave Pix' using errcode = '22023';
  elsif v_chave <> '' and v_tipo = 'telefone' and length(v_digitos) not between 10 and 15 then
    raise exception 'A chave Pix de telefone deve conter de 10 a 15 dígitos' using errcode = '22023';
  elsif v_chave <> '' and v_tipo = 'aleatoria' and length(v_chave) not between 1 and 120 then
    raise exception 'A chave Pix aleatória é inválida' using errcode = '22023';
  end if;
  if v_whatsapp <> '' and length(regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 10 and 15 then
    raise exception 'O WhatsApp deve conter de 10 a 15 dígitos' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.rifa_validar_dados_campanha_admin(text,text,text) from public, anon, authenticated;

create or replace function public.rifa_salvar_configuracoes_campanha_etapa9(
  p_campanha_id uuid, p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer, p_valor_bilhete numeric,
  p_criterio_sorteio text, p_situacao text,
  p_tipo_chave_pix text, p_chave_pix text, p_whatsapp text
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo text := coalesce(p_tipo_chave_pix,'');
  v_chave text := btrim(coalesce(p_chave_pix,''));
  v_whatsapp text := btrim(coalesce(p_whatsapp,''));
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  perform public.rifa_validar_dados_campanha_admin(v_tipo,v_chave,v_whatsapp);
  perform public.rifa_salvar_configuracoes_campanha(
    p_campanha_id, p_nome_entidade, p_nome_campanha, p_nome_rifa,
    p_descricao_premio, p_quantidade_bilhetes, p_valor_bilhete,
    p_criterio_sorteio, p_situacao
  );
  insert into public.rifa_dados_campanha_admin(campanha_id,tipo_chave_pix,chave_pix,whatsapp,atualizado_em)
    values(p_campanha_id,v_tipo,v_chave,v_whatsapp,now())
  on conflict(campanha_id) do update set
    tipo_chave_pix=excluded.tipo_chave_pix, chave_pix=excluded.chave_pix,
    whatsapp=excluded.whatsapp, atualizado_em=excluded.atualizado_em;
end;
$$;
revoke all on function public.rifa_salvar_configuracoes_campanha_etapa9(uuid,text,text,text,text,integer,numeric,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_salvar_configuracoes_campanha_etapa9(uuid,text,text,text,text,integer,numeric,text,text,text,text,text)
  to authenticated;

create or replace function public.rifa_criar_campanha_etapa9(
  p_nome_entidade text, p_nome_campanha text, p_nome_rifa text,
  p_descricao_premio text, p_quantidade_bilhetes integer, p_valor_bilhete numeric,
  p_criterio_sorteio text, p_situacao text,
  p_tipo_chave_pix text, p_chave_pix text, p_whatsapp text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_tipo text := coalesce(p_tipo_chave_pix,'');
  v_chave text := btrim(coalesce(p_chave_pix,''));
  v_whatsapp text := btrim(coalesce(p_whatsapp,''));
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  perform public.rifa_validar_dados_campanha_admin(v_tipo,v_chave,v_whatsapp);
  v_id := public.rifa_criar_campanha(
    p_nome_entidade,p_nome_campanha,p_nome_rifa,p_descricao_premio,
    p_quantidade_bilhetes,p_valor_bilhete,p_criterio_sorteio,p_situacao
  );
  insert into public.rifa_dados_campanha_admin(campanha_id,tipo_chave_pix,chave_pix,whatsapp)
    values(v_id,v_tipo,v_chave,v_whatsapp);
  return v_id;
end;
$$;
revoke all on function public.rifa_criar_campanha_etapa9(text,text,text,text,integer,numeric,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.rifa_criar_campanha_etapa9(text,text,text,text,integer,numeric,text,text,text,text,text)
  to authenticated;

create or replace function public.rifa_restaurar_backup_campanha(p_campanha_id uuid, p_backup jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_config jsonb;
  v_dados jsonb;
  v_participantes jsonb;
  v_registros jsonb;
  v_sorteios jsonb;
  v_item jsonb;
  v_pessoa jsonb;
  v_nome text;
  v_telefone text;
  v_situacao text;
  v_numero integer;
  v_valor numeric;
  v_pago boolean;
  v_origem_id uuid;
  v_participante_id uuid;
  v_quantidade integer;
  v_registros_salvos integer := 0;
  v_registros_preservados integer := 0;
  v_sorteios_salvos integer := 0;
  v_sorteios_duplicados integer := 0;
  v_rows integer;
  v_mapa jsonb := '{}'::jsonb;
  v_numeros_vistos integer[] := array[]::integer[];
  v_id_sorteio uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_campanha_id is null or jsonb_typeof(p_backup) <> 'object'
    or p_backup->>'aplicativo' is distinct from 'Rifa Deixa Vim'
    or coalesce((p_backup->>'versao')::integer,3) not between 3 and 4 then
    raise exception 'Arquivo de backup inválido' using errcode = '22023';
  end if;
  if coalesce((p_backup->>'versao')::integer,3)=4
    and coalesce(p_backup#>>'{campanha,id}','') <> p_campanha_id::text then
    raise exception 'O backup pertence a outra campanha ou não identifica a campanha' using errcode = '22023';
  end if;
  if nullif(p_backup#>>'{campanha,id}','') is not null
    and p_backup#>>'{campanha,id}' <> p_campanha_id::text then
    raise exception 'O backup pertence a outra campanha' using errcode = '22023';
  end if;
  v_config := p_backup#>'{campanha,configuracao}';
  v_dados := p_backup#>'{campanha,dadosPagamento}';
  v_participantes := coalesce(p_backup->'participantes','[]'::jsonb);
  v_registros := coalesce(p_backup->'registros','[]'::jsonb);
  v_sorteios := coalesce(p_backup->'sorteios','[]'::jsonb);
  if jsonb_typeof(v_participantes) <> 'array' or jsonb_typeof(v_registros) <> 'array'
    or jsonb_typeof(v_sorteios) <> 'array' then
    raise exception 'Estrutura de backup inválida' using errcode = '22023';
  end if;

  if jsonb_typeof(v_config) = 'object' then
    if jsonb_typeof(v_dados) <> 'object' then v_dados := '{}'::jsonb; end if;
    perform public.rifa_salvar_configuracoes_campanha_etapa9(
      p_campanha_id, v_config->>'nome_entidade', v_config->>'nome_campanha',
      v_config->>'nome_rifa', v_config->>'descricao_premio',
      (v_config->>'quantidade_bilhetes')::integer, (v_config->>'valor_bilhete')::numeric,
      v_config->>'criterio_sorteio', v_config->>'situacao',
      coalesce(v_dados->>'tipo_chave_pix',''), coalesce(v_dados->>'chave_pix',''),
      coalesce(v_dados->>'whatsapp','')
    );
  end if;
  select quantidade_bilhetes into v_quantidade
    from public.rifa_configuracoes where campanha_id=p_campanha_id;
  if v_quantidade is null then raise exception 'Campanha não encontrada'; end if;
  if coalesce((p_backup->>'versao')::integer,3)=4
    and jsonb_array_length(v_registros)<>v_quantidade then
    raise exception 'A cartela do backup não corresponde à quantidade da campanha' using errcode='22023';
  end if;

  -- Cria cadastros apenas para bilhetes livres que possam ser restaurados.
  for v_item in select value from jsonb_array_elements(v_registros)
  loop
    v_numero := (v_item->>'numero')::integer;
    v_situacao := coalesce(v_item->>'situacao',v_item->>'status');
    if v_numero is null or v_numero not between 1 and v_quantidade or v_situacao is null
      or v_situacao not in ('disponivel','reservado','vendido') then
      raise exception 'Número ou situação inválidos no backup' using errcode = '22023';
    end if;
    if v_numero=any(v_numeros_vistos) then
      raise exception 'O backup contém números duplicados' using errcode='22023';
    end if;
    v_numeros_vistos := array_append(v_numeros_vistos,v_numero);
    if v_situacao = 'disponivel' then
      if coalesce((p_backup->>'versao')::integer,3)=4 and (
        coalesce(v_item->>'comprador',v_item->>'nome','')<>'' or
        coalesce(v_item->>'telefone','')<>'' or coalesce((v_item->>'pago')::boolean,false) or
        coalesce((v_item->>'valor')::numeric,0) not between 0.01 and 999999.99
      ) then raise exception 'O número disponível contém dados de participante ou pagamento' using errcode='22023'; end if;
      continue;
    end if;
    v_nome := btrim(coalesce(v_item->>'comprador',v_item->>'nome',''));
    v_telefone := nullif(btrim(coalesce(v_item->>'telefone','')),'');
    v_valor := (v_item->>'valor')::numeric;
    v_pago := coalesce((v_item->>'pago')::boolean,v_situacao='vendido');
    if length(v_nome) not between 1 and 100 or length(coalesce(v_telefone,'')) > 30
      or v_valor is null or v_valor not between 0.01 and 999999.99
      or v_pago is distinct from (v_situacao='vendido') then
      raise exception 'Dados do participante ou pagamento inválidos no backup' using errcode = '22023';
    end if;

    perform 1 from public.rifa_numeros n
      where n.campanha_id=p_campanha_id and n.numero=v_numero for update;
    if not found or exists (
      select 1 from public.rifa_numeros n
      where n.campanha_id=p_campanha_id and n.numero=v_numero and n.situacao <> 'disponivel'
    ) or exists (
      select 1 from public.rifa_sorteios s
      where s.campanha_id=p_campanha_id and s.numero=v_numero
    ) then
      v_registros_preservados := v_registros_preservados + 1;
      continue;
    end if;

    v_participante_id := null;
    v_origem_id := nullif(v_item->>'participante_id','')::uuid;
    if v_origem_id is not null and v_mapa ? v_origem_id::text then
      v_participante_id := (v_mapa->>v_origem_id::text)::uuid;
    else
      v_pessoa := null;
      if v_origem_id is not null then
        select value into v_pessoa from jsonb_array_elements(v_participantes)
          where value->>'id'=v_origem_id::text limit 1;
      end if;
      if v_pessoa is not null then
        v_nome := btrim(coalesce(v_pessoa->>'nome_completo',v_pessoa->>'nome',v_nome));
        v_telefone := nullif(btrim(coalesce(v_pessoa->>'telefone',v_telefone,'')),'');
      end if;
      if v_origem_id is not null then
        select p.id into v_participante_id from public.rifa_participantes p
          where p.id=v_origem_id
            and p.nome_normalizado=public.rifa_normalizar_nome(v_nome)
            and p.telefone_normalizado=public.rifa_normalizar_telefone(v_telefone);
        if v_participante_id is null then
          if exists(select 1 from public.rifa_participantes p where p.id=v_origem_id) then
            insert into public.rifa_participantes(id,nome_completo,nome_normalizado,telefone,telefone_normalizado)
              values(gen_random_uuid(),v_nome,public.rifa_normalizar_nome(v_nome),v_telefone,public.rifa_normalizar_telefone(v_telefone))
              returning id into v_participante_id;
          else
            insert into public.rifa_participantes(id,nome_completo,nome_normalizado,telefone,telefone_normalizado)
              values(v_origem_id,v_nome,public.rifa_normalizar_nome(v_nome),v_telefone,public.rifa_normalizar_telefone(v_telefone))
              returning id into v_participante_id;
          end if;
        end if;
        v_mapa := v_mapa || jsonb_build_object(v_origem_id::text,v_participante_id::text);
      else
        insert into public.rifa_participantes(nome_completo,nome_normalizado,telefone,telefone_normalizado)
          values(v_nome,public.rifa_normalizar_nome(v_nome),v_telefone,public.rifa_normalizar_telefone(v_telefone))
          returning id into v_participante_id;
      end if;
    end if;

    update public.rifa_numeros set
      situacao=v_situacao, comprador=v_nome, telefone=v_telefone, pago=v_pago,
      valor=v_valor, participante_id=v_participante_id,
      atualizado_em=coalesce(nullif(v_item->>'atualizado_em','')::timestamptz,now())
    where campanha_id=p_campanha_id and numero=v_numero and situacao='disponivel';
    get diagnostics v_rows = row_count;
    if v_rows=1 then v_registros_salvos := v_registros_salvos + 1;
    else v_registros_preservados := v_registros_preservados + 1; end if;
  end loop;

  for v_item in select value from jsonb_array_elements(v_sorteios)
  loop
    v_id_sorteio := coalesce(nullif(v_item->>'id','')::uuid,gen_random_uuid());
    if (v_item->>'numero')::integer not between 1 and 10000
      or coalesce(v_item->>'modalidade','') not in ('vendidos','todos')
      or coalesce(v_item->>'situacao','') not in ('disponivel','reservado','vendido')
      or coalesce((v_item->>'participantes')::integer,0) not between 1 and 10000 then
      raise exception 'Registro de sorteio inválido no backup' using errcode = '22023';
    end if;
    insert into public.rifa_sorteios
      (id,campanha_id,numero,modalidade,situacao,ganhador,participantes,realizado_em,criado_por)
    values(v_id_sorteio,p_campanha_id,(v_item->>'numero')::integer,v_item->>'modalidade',
      v_item->>'situacao',nullif(v_item->>'ganhador',''),(v_item->>'participantes')::integer,
      coalesce(nullif(v_item->>'realizado_em','')::timestamptz,now()),auth.uid())
    on conflict(id) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows=1 then v_sorteios_salvos := v_sorteios_salvos + 1;
    else v_sorteios_duplicados := v_sorteios_duplicados + 1; end if;
  end loop;

  return jsonb_build_object(
    'registros_restaurados',v_registros_salvos,
    'registros_preservados',v_registros_preservados,
    'sorteios_restaurados',v_sorteios_salvos,
    'sorteios_duplicados',v_sorteios_duplicados
  );
end;
$$;
revoke all on function public.rifa_restaurar_backup_campanha(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.rifa_restaurar_backup_campanha(uuid,jsonb) to authenticated;

commit;
