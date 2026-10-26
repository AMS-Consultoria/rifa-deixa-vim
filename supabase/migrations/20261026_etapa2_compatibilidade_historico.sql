-- Compatibilidade com o aplicativo publicado antes do seletor de campanhas.
-- Novas versões enviam campanha_id explicitamente; a versão anterior usa Campanha 01.
begin;
do $$
declare v_id uuid;
begin
  select id into strict v_id from public.rifa_campanhas where codigo = 1;
  execute format(
    'alter table public.rifa_sorteios alter column campanha_id set default %L::uuid',
    v_id
  );
end;
$$;
commit;
