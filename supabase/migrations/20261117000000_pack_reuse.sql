-- Réutilisation des fiches : une fiche préparée pour une demande strictement identique (même consigne système,
-- même année et section, mêmes adaptations et centres d'intérêt, mêmes attendus, même texte de tâche) est copiée
-- au lieu d'appeler l'IA. Seule l'empreinte de la demande est gardée (aucun texte en clair).
alter table public.study_pack
  add column request_key text check (request_key ~ '^[0-9a-f]{64}$'),
  -- Attendu du programme reconnu par l'IA pour cette demande (repris lors d'une réutilisation).
  add column curriculum_item_id uuid references public.curriculum_item (id) on delete set null;

-- Recherche d'une fiche réutilisable : les fiches signalées par un parent ne sont jamais reprises.
create index study_pack_request_key_idx on public.study_pack (request_key, created_at desc)
  where request_key is not null and reported_at is null;
create index study_pack_curriculum_item_id_idx on public.study_pack (curriculum_item_id)
  where curriculum_item_id is not null;
