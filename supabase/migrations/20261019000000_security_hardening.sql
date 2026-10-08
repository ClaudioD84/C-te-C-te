-- Durcissement (revue de sécurité avant lancement).

-- 1. Une photo est toujours rangée dans le dossier de sa famille : les fonctions serveur, qui lisent et
--    suppriment le fichier avec les droits d'administration, ne peuvent pas être détournées vers la photo
--    d'une autre famille.
alter table public.scan
  add constraint scan_storage_path_family
  check (storage_path is null or storage_path like family_id::text || '/%');

-- 2. Le parent ne modifie que ce dont l'application a besoin (et que les règles par ligne laissent passer).
--    Les autres colonnes (dates de traitement, chemin du fichier, contenu généré…) sont réservées au serveur.
revoke update on public.scan from authenticated;
grant update (status) on public.scan to authenticated;

revoke update on public.study_pack from authenticated;
grant update (reported_at, report_reason) on public.study_pack to authenticated;

revoke update on public.flashcard from authenticated;
grant update (interval_days, ease, repetitions, due_on, last_reviewed_at) on public.flashcard to authenticated;

-- Côté parent, une numérisation naît « déposée » et ne peut passer que de « à vérifier » à « validée ».
create function public.scan_parent_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'uploaded' or new.processed_at is not null or new.processing_started_at is not null then
      raise exception 'Numérisation invalide' using errcode = '42501';
    end if;
  elsif new.status is distinct from old.status and not (old.status = 'draft' and new.status = 'validated') then
    raise exception 'Changement de statut non autorisé' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger scan_parent_guard
  before insert or update on public.scan
  for each row execute function public.scan_parent_guard();

-- 3. Privilèges inutiles pour les rôles de l'API (non exposés par PostgREST, retirés par prudence).
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
revoke execute on function public.check_child_limit() from anon, authenticated, public;
revoke execute on function public.child_limit(text) from anon, public;
