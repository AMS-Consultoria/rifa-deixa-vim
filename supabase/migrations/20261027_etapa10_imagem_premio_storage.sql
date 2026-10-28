-- Etapa 10: armazenar fotos de prêmio de forma privada por campanha.
-- Aplicar no Supabase SQL Editor. Não altera nem recria dados das rifas.
begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('rifa-premios','rifa-premios',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  name=excluded.name,
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists rifa_premio_admin_ler on storage.objects;
drop policy if exists rifa_premio_admin_enviar on storage.objects;
drop policy if exists rifa_premio_admin_atualizar on storage.objects;

create policy rifa_premio_admin_ler on storage.objects for select to authenticated
using (
  bucket_id='rifa-premios'
  and name=split_part(name,'/',1)||'/premio'
  and exists(select 1 from public.rifa_administradores a where a.user_id=auth.uid())
  and exists(select 1 from public.rifa_campanhas c where c.id::text=split_part(name,'/',1))
);
create policy rifa_premio_admin_enviar on storage.objects for insert to authenticated
with check (
  bucket_id='rifa-premios'
  and name=split_part(name,'/',1)||'/premio'
  and exists(select 1 from public.rifa_administradores a where a.user_id=auth.uid())
  and exists(select 1 from public.rifa_campanhas c where c.id::text=split_part(name,'/',1))
);
create policy rifa_premio_admin_atualizar on storage.objects for update to authenticated
using (
  bucket_id='rifa-premios'
  and name=split_part(name,'/',1)||'/premio'
  and exists(select 1 from public.rifa_administradores a where a.user_id=auth.uid())
  and exists(select 1 from public.rifa_campanhas c where c.id::text=split_part(name,'/',1))
)
with check (
  bucket_id='rifa-premios'
  and name=split_part(name,'/',1)||'/premio'
  and exists(select 1 from public.rifa_administradores a where a.user_id=auth.uid())
  and exists(select 1 from public.rifa_campanhas c where c.id::text=split_part(name,'/',1))
);

commit;