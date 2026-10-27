-- Etapa 6: totais financeiros por campanha, sem expor dados pessoais.
-- Preparada para aplicar no Supabase somente após aprovação.
begin;

create or replace function public.rifa_resumo_financeiro_publico(p_campanha_id uuid)
returns table (total_recebido numeric, total_a_receber numeric, total_geral numeric)
language sql stable security definer set search_path = ''
as $$
  select
    coalesce(sum(case when n.pago then coalesce(n.valor,c.valor_bilhete,0) else 0 end),0)::numeric,
    coalesce(sum(case when n.situacao='reservado' and not n.pago then coalesce(n.valor,c.valor_bilhete,0) else 0 end),0)::numeric,
    coalesce(sum(case when n.pago or (n.situacao='reservado' and not n.pago) then coalesce(n.valor,c.valor_bilhete,0) else 0 end),0)::numeric
  from public.rifa_configuracoes c
  left join public.rifa_numeros n on n.campanha_id=c.campanha_id
  where c.campanha_id=p_campanha_id;
$$;
revoke all on function public.rifa_resumo_financeiro_publico(uuid) from public,anon,authenticated;
grant execute on function public.rifa_resumo_financeiro_publico(uuid) to anon,authenticated;

commit;
