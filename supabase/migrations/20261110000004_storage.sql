-- =====================================================================
-- STRUCTURA — stockage des documents (Supabase Storage).
--
-- Seau privé « documents » : aucun accès public. Les fichiers sont
-- renommés côté serveur (uploads/AAAA/<uuid>.<ext>), contrôlés (taille,
-- extension, signature binaire) avant dépôt, puis servis par URL signée
-- à courte durée après vérification des droits.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "documents: dépôt par l'équipe" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and name ~ '^uploads/[0-9]{4}/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$'
    and (select public.has_permission('documents.manage'))
  );

create policy "documents: lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      (select public.has_permission('documents.manage'))
      or exists (
        select 1 from public.documents d
        where d.storage_path = storage.objects.name and d.status = 'published'
      ) and (select public.is_active_user())
    )
  );

create policy "documents: suppression par l'équipe" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.has_permission('documents.manage')));
