-- Document de plusieurs pages (une interrogation de deux feuilles, une liste de vocabulaire recto verso…) :
-- la première photo reste dans storage_path, les suivantes (4 au plus) sont rangées ici, dans l'ordre. Elles sont
-- lues ensemble par une seule analyse, puis toutes effacées en même temps (ou par la purge, avant 24 heures).

alter table public.scan add column extra_storage_paths text[] not null default '{}';

comment on column public.scan.extra_storage_paths is
  'Pages 2 et suivantes du document photographié ; vidé avec storage_path dès la fin de l''analyse.';

-- Vrai si chaque chemin est rangé dans le dossier indiqué.
create function public.paths_in_folder(paths text[], folder text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(p like folder || '/%'), true) from unnest(paths) as p;
$$;

-- Comme storage_path (voir security_hardening) : jamais hors du dossier de la famille, jamais sans première page.
alter table public.scan
  add constraint scan_extra_storage_paths_check check (
    cardinality(extra_storage_paths) <= 4
    and (storage_path is not null or cardinality(extra_storage_paths) = 0)
    and public.paths_in_folder(extra_storage_paths, family_id::text)
  );

-- La réservation renvoie aussi les pages suivantes.
drop function public.claim_scan(uuid, uuid);

create function public.claim_scan(p_scan_id uuid, p_family_id uuid)
returns table (id uuid, child_id uuid, document_type text, storage_path text, extra_storage_paths text[])
language sql
security invoker
set search_path = ''
as $$
  update public.scan s
    set status = 'processing', error = null, processing_started_at = now()
    where s.id = p_scan_id
      and s.family_id = p_family_id
      and (
        s.status in ('uploaded', 'failed')
        or (s.status = 'processing' and s.processing_started_at < now() - interval '150 seconds')
      )
    returning s.id, s.child_id, s.document_type, s.storage_path, s.extra_storage_paths;
$$;

revoke execute on function public.claim_scan(uuid, uuid) from anon, authenticated, public;
grant execute on function public.claim_scan(uuid, uuid) to service_role;
