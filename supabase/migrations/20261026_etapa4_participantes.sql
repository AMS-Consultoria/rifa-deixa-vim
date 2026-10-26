-- Etapa 4: cadastro único de participantes. Não aplicar em produção sem aprovação.
begin;
create or replace function public.rifa_normalizar_nome(p text) returns text language sql immutable set search_path='' as $$ select translate(lower(regexp_replace(btrim(coalesce(p,'')), '\s+', ' ', 'g')), 'áàâãäåāăąçćčďđéèêëēėęěíìîïīįñńóòôõöøōőŕřśšşťțúùûüūůűųýÿžźż', 'aaaaaaaaacccdđeeeeeeeeiiiiiinnoooooøoorrsssttuuuuuuuuyyzzz'); $$;
create or replace function public.rifa_normalizar_telefone(p text) returns text language sql immutable set search_path='' as $$ select regexp_replace(coalesce(p,''), '[^0-9]', '', 'g'); $$;
revoke all on function public.rifa_normalizar_nome(text) from public,anon,authenticated;
revoke all on function public.rifa_normalizar_telefone(text) from public,anon,authenticated;
create table public.rifa_participantes(id uuid primary key default gen_random_uuid(), nome_completo text not null check(length(btrim(nome_completo)) between 1 and 100), nome_normalizado text not null, telefone text, telefone_normalizado text not null default '', criado_em timestamptz not null default now(), migration_key text unique);
create index rifa_participantes_nome_idx on public.rifa_participantes(nome_normalizado);
alter table public.rifa_participantes enable row level security;
revoke all on public.rifa_participantes from public,anon,authenticated;
grant select on public.rifa_participantes to authenticated;
create policy rifa_participantes_admin_select on public.rifa_participantes for select to authenticated using(exists(select 1 from public.rifa_administradores a where a.user_id=auth.uid()));
alter table public.rifa_numeros add column participante_id uuid references public.rifa_participantes(id) on delete set null;
create index rifa_numeros_participante_idx on public.rifa_numeros(participante_id) where participante_id is not null;
-- Cada registro legado recebe identidade própria para preservar possíveis homônimos.
insert into public.rifa_participantes(migration_key,nome_completo,nome_normalizado,telefone,telefone_normalizado,criado_em)
select campanha_id::text||':'||numero::text,btrim(comprador),public.rifa_normalizar_nome(comprador),nullif(btrim(telefone),''),public.rifa_normalizar_telefone(telefone),coalesce(atualizado_em,now())
from public.rifa_numeros where situacao<>'disponivel' and nullif(btrim(comprador),'') is not null;
update public.rifa_numeros n set participante_id=p.id from public.rifa_participantes p where p.migration_key=n.campanha_id::text||':'||n.numero::text;
alter table public.rifa_participantes drop column migration_key;
create or replace function public.rifa_salvar_participacao(p_campanha_id uuid,p_numero integer,p_situacao_anterior text,p_situacao text,p_nome text,p_telefone text,p_participante_id uuid default null,p_confirmar_homonimo boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_n public.rifa_numeros%rowtype; v_p public.rifa_participantes%rowtype; v_nome text:=btrim(coalesce(p_nome,'')); v_norm text; v_tel text:=nullif(btrim(coalesce(p_telefone,'')),''); v_tel_norm text; v_candidatos jsonb; v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.rifa_administradores where user_id=auth.uid()) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_campanha_id is null or p_numero is null or p_numero<1 or p_situacao_anterior is null or p_situacao_anterior not in ('disponivel','reservado','vendido') or p_situacao is null or p_situacao not in ('disponivel','reservado','vendido') then raise exception 'Dados inválidos' using errcode='22023'; end if;
 select * into v_n from public.rifa_numeros where campanha_id=p_campanha_id and numero=p_numero for update;
 if not found then raise exception 'Número não encontrado' using errcode='22023'; end if;
 if v_n.situacao<>p_situacao_anterior then raise exception 'O número foi alterado. Atualize e tente novamente.' using errcode='40001'; end if;
 if p_situacao='disponivel' then update public.rifa_numeros set situacao='disponivel',comprador=null,telefone=null,participante_id=null,pago=false,atualizado_em=now() where campanha_id=p_campanha_id and numero=p_numero; return jsonb_build_object('status','salvo'); end if;
 if length(v_nome) not between 1 and 100 or length(coalesce(v_tel,''))>30 then raise exception 'Informe o nome completo e um telefone válido.' using errcode='22023'; end if;
 v_norm:=public.rifa_normalizar_nome(v_nome); v_tel_norm:=public.rifa_normalizar_telefone(v_tel);
 perform pg_advisory_xact_lock(hashtextextended(v_norm,73142));
 if p_participante_id is not null then
   select * into v_p from public.rifa_participantes where id=p_participante_id and nome_normalizado=v_norm;
   if not found then raise exception 'Participante selecionado inválido.' using errcode='22023'; end if;
   v_id:=v_p.id; v_nome:=v_p.nome_completo; v_tel:=v_p.telefone;
 else
   select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome_completo',nome_completo,'telefone',telefone,'criado_em',criado_em) order by criado_em,id),'[]'::jsonb) into v_candidatos from public.rifa_participantes where nome_normalizado=v_norm;
   if jsonb_array_length(v_candidatos)>0 and not coalesce(p_confirmar_homonimo,false) then return jsonb_build_object('status','duplicado','candidatos',v_candidatos); end if;
   insert into public.rifa_participantes(nome_completo,nome_normalizado,telefone,telefone_normalizado) values(v_nome,v_norm,v_tel,v_tel_norm) returning id into v_id;
 end if;
 update public.rifa_numeros set situacao=p_situacao,comprador=v_nome,telefone=v_tel,participante_id=v_id,pago=(p_situacao='vendido'),valor=case when v_n.situacao='disponivel' then (select valor_bilhete from public.rifa_configuracoes where campanha_id=p_campanha_id) else valor end,atualizado_em=now() where campanha_id=p_campanha_id and numero=p_numero;
 return jsonb_build_object('status','salvo','participante_id',v_id);
end; $$;
revoke all on function public.rifa_salvar_participacao(uuid,integer,text,text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.rifa_salvar_participacao(uuid,integer,text,text,text,text,uuid,boolean) to authenticated;
commit;
begin;
create or replace function public.rifa_preparar_participante_numero()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_nome text; v_norm text; v_tel text; v_tel_norm text; v_id uuid; v_count integer; v_p public.rifa_participantes%rowtype;
begin
  if new.situacao='disponivel' then new.participante_id:=null; return new; end if;
  v_nome:=btrim(coalesce(new.comprador,''));
  if length(v_nome) not between 1 and 100 then raise exception 'Informe o nome completo do participante.' using errcode='22023'; end if;
  v_norm:=public.rifa_normalizar_nome(v_nome);
  v_tel:=nullif(btrim(coalesce(new.telefone,'')),'');
  v_tel_norm:=public.rifa_normalizar_telefone(v_tel);
  if new.participante_id is not null then
    select * into v_p from public.rifa_participantes where id=new.participante_id;
    if not found or v_p.nome_normalizado<>v_norm or v_p.telefone_normalizado<>v_tel_norm then
      raise exception 'O vínculo do participante não corresponde aos dados enviados.' using errcode='22023';
    end if;
    new.comprador:=v_p.nome_completo; new.telefone:=v_p.telefone; return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_norm,73142));
  select count(*),min(id::text)::uuid into v_count,v_id from public.rifa_participantes
    where nome_normalizado=v_norm and telefone_normalizado=v_tel_norm;
  if v_count=1 then
    select * into v_p from public.rifa_participantes where id=v_id;
    new.participante_id:=v_id; new.comprador:=v_p.nome_completo; new.telefone:=v_p.telefone; return new;
  end if;
  if v_count>1 then raise exception 'Mais de um cadastro corresponde ao participante. Selecione pela tela de participantes.' using errcode='22023'; end if;
  select count(*) into v_count from public.rifa_participantes where nome_normalizado=v_norm;
  if v_count>0 then raise exception 'Participante já cadastrado. Selecione o cadastro existente ou confirme o homônimo na tela.' using errcode='22023'; end if;
  insert into public.rifa_participantes(nome_completo,nome_normalizado,telefone,telefone_normalizado)
    values(v_nome,v_norm,v_tel,v_tel_norm) returning id into v_id;
  new.participante_id:=v_id; return new;
end;
$$;
revoke all on function public.rifa_preparar_participante_numero() from public,anon,authenticated;
create trigger rifa_preparar_participante_numero
before insert or update of situacao,comprador,telefone,participante_id on public.rifa_numeros
for each row execute function public.rifa_preparar_participante_numero();
commit;
