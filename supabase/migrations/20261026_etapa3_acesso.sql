-- ETAPA 3: proposta. Executar somente após aprovação específica.
-- Não altera contas existentes, vendas, pagamentos ou permissões administrativas.
begin;

-- Identificador de usuário com unicidade; nunca armazena senha.
create table public.rifa_usuarios (
 user_id uuid primary key references auth.users(id) on delete cascade,
 login text collate "C" not null unique check(login ~ '^[a-z][a-z0-9_]{2,29}$'),
 criado_em timestamptz not null default now()
);
alter table public.rifa_usuarios enable row level security;
revoke all on public.rifa_usuarios from public,anon,authenticated;
grant select on public.rifa_usuarios to authenticated;
create policy rifa_usuario_consulta on public.rifa_usuarios for select to authenticated using(
 user_id=auth.uid() or exists(select 1 from public.rifa_administradores where user_id=auth.uid())
);
-- O identificador interno substitui o e-mail no Auth. Não é uma caixa postal real.
-- A unicidade é garantida na mesma transação que cria a conta, sem usar metadados de perfil.
create function public.rifa_registrar_login()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_login text;
begin
 if lower(split_part(new.email,'@',2))='rifa-deixa-vim.invalid' then
  v_login := lower(split_part(new.email,'@',1));
  if v_login !~ '^[a-z][a-z0-9_]{2,29}$' or v_login in ('admin','administrador','padrao') then
   raise exception 'Nome de usuário indisponível' using errcode='22023';
  end if;
  insert into public.rifa_usuarios(user_id,login) values(new.id,v_login);
 end if;
 return new;
end;
$$;
revoke all on function public.rifa_registrar_login() from public,anon,authenticated;
create trigger rifa_registrar_login after insert on auth.users
 for each row execute function public.rifa_registrar_login();
-- Evita desalinhar o login de uma conta já cadastrada. Troca de senha permanece disponível.
create function public.rifa_preservar_login()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.email is distinct from old.email and exists(select 1 from public.rifa_usuarios where user_id=old.id) then
  raise exception 'O nome de usuário não pode ser alterado por esta operação' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function public.rifa_preservar_login() from public,anon,authenticated;
create trigger rifa_preservar_login before update of email on auth.users
 for each row execute function public.rifa_preservar_login();

create table public.rifa_acessos_numeros (
  campanha_id uuid not null,
  numero integer not null,
  usuario_id uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (campanha_id, numero),
  foreign key (campanha_id,numero) references public.rifa_numeros(campanha_id,numero) on delete restrict
);
create index rifa_acessos_usuario_idx on public.rifa_acessos_numeros(usuario_id,campanha_id);
alter table public.rifa_acessos_numeros enable row level security;
revoke all on public.rifa_acessos_numeros from public,anon,authenticated;
grant select on public.rifa_acessos_numeros to authenticated;
create policy rifa_acessos_consulta on public.rifa_acessos_numeros for select to authenticated
  using (usuario_id=auth.uid() or exists (
    select 1 from public.rifa_administradores a where a.user_id=auth.uid()
  ));

-- Somente dados dos próprios números. Nunca recebe um usuário escolhido pelo cliente.
create function public.rifa_minhas_participacoes(p_campanha_id uuid)
returns table(numero integer,situacao text,pago boolean,valor numeric)
language sql stable security definer set search_path=''
as $$
  select n.numero::integer,n.situacao::text,n.pago,n.valor::numeric
  from public.rifa_numeros n
  join public.rifa_acessos_numeros a on a.campanha_id=n.campanha_id and a.numero=n.numero
  join public.rifa_configuracoes c on c.campanha_id=n.campanha_id
  where a.usuario_id=auth.uid() and auth.uid() is not null
    and n.campanha_id=p_campanha_id and n.situacao<>'disponivel'
    and n.numero between 1 and c.quantidade_bilhetes
  order by n.numero;
$$;
revoke all on function public.rifa_minhas_participacoes(uuid) from public,anon,authenticated;
grant execute on function public.rifa_minhas_participacoes(uuid) to authenticated;

create function public.rifa_conta_numero(p_campanha_id uuid,p_numero integer)
returns text language plpgsql stable security definer set search_path=''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores where user_id=auth.uid()
  ) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
  return (select u.login::text from public.rifa_acessos_numeros a
    join public.rifa_usuarios u on u.user_id=a.usuario_id
    where a.campanha_id=p_campanha_id and a.numero=p_numero);
end;
$$;
revoke all on function public.rifa_conta_numero(uuid,integer) from public,anon,authenticated;
grant execute on function public.rifa_conta_numero(uuid,integer) to authenticated;

create function public.rifa_vincular_acesso_numero(p_campanha_id uuid,p_numero integer,p_login text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_usuario uuid; v_situacao text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.rifa_administradores where user_id=auth.uid()
  ) then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
  select situacao into v_situacao from public.rifa_numeros
    where campanha_id=p_campanha_id and numero=p_numero for update;
  if not found or v_situacao='disponivel' then
    raise exception 'Selecione um número reservado ou vendido' using errcode='22023';
  end if;
  if p_login is not null then
    if lower(btrim(p_login)) !~ '^[a-z][a-z0-9_]{2,29}$' then
      raise exception 'Usuário inválido' using errcode='22023';
    end if;
    select u.id into v_usuario from auth.users u join public.rifa_usuarios p on p.user_id=u.id
      where p.login=lower(btrim(p_login))
        and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
    if not found then raise exception 'Conta cadastrada não encontrada' using errcode='22023'; end if;
  end if;
  insert into public.rifa_acessos_numeros(campanha_id,numero,usuario_id)
    values(p_campanha_id,p_numero,v_usuario)
    on conflict(campanha_id,numero) do update
      set usuario_id=excluded.usuario_id,atualizado_em=now();
end;
$$;
revoke all on function public.rifa_vincular_acesso_numero(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.rifa_vincular_acesso_numero(uuid,integer,text) to authenticated;

-- Um vínculo antigo não pode permitir consultar o número de outro participante.
-- Reserva -> venda preserva o vínculo quando a pessoa permanece a mesma.
create function public.rifa_invalidar_acesso_numero()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.situacao='disponivel' or new.comprador is distinct from old.comprador
    or new.telefone is distinct from old.telefone then
    update public.rifa_acessos_numeros set usuario_id=null,atualizado_em=now()
      where campanha_id=old.campanha_id and numero=old.numero and usuario_id is not null;
  end if;
  return new;
end;
$$;
revoke all on function public.rifa_invalidar_acesso_numero() from public,anon,authenticated;
create trigger rifa_invalidar_acesso_numero after update of situacao,comprador,telefone
  on public.rifa_numeros for each row execute function public.rifa_invalidar_acesso_numero();
commit;
