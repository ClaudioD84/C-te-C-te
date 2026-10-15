-- Permet de relancer une analyse restée bloquée (fonction interrompue, réseau coupé…).
alter table public.scan add column processing_started_at timestamptz;

-- Réserve une photo pour l'analyse, de façon atomique : depuis « uploaded », « failed »,
-- ou une analyse « processing » bloquée depuis plus de 150 s (limite d'exécution des fonctions).
-- Appelée uniquement par la fonction serveur (rôle service).
create function public.claim_scan(p_scan_id uuid, p_family_id uuid)
returns table (id uuid, child_id uuid, document_type text, storage_path text)
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
    returning s.id, s.child_id, s.document_type, s.storage_path;
$$;

revoke execute on function public.claim_scan(uuid, uuid) from anon, authenticated, public;
grant execute on function public.claim_scan(uuid, uuid) to service_role;
