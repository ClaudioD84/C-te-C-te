-- Côte à Côte — schéma initial (étape 1)
-- Toutes les données d'une famille portent family_id et sont protégées par RLS :
-- un parent ne voit et ne modifie que les données de sa propre famille.

-- ---------------------------------------------------------------------------
-- Familles et parents
-- ---------------------------------------------------------------------------

create table public.family (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.parent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.family (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index parent_family_id_idx on public.parent (family_id);

-- Famille de l'utilisateur connecté. SECURITY DEFINER pour éviter une récursion des politiques RLS.
create function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.parent where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Abonnement (alimenté par le webhook RevenueCat, en lecture seule pour les parents)
-- ---------------------------------------------------------------------------

create table public.subscription (
  family_id uuid primary key references public.family (id) on delete cascade,
  plan text not null default 'essai' check (plan in ('essai', 'solo', 'famille')),
  status text not null default 'trial' check (status in ('trial', 'active', 'expired', 'cancelled')),
  current_period_end timestamptz not null,
  updated_at timestamptz not null default now()
);

-- À l'inscription : création de la famille, du parent et de l'essai gratuit de 14 jours.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
begin
  insert into public.family default values returning id into new_family_id;
  insert into public.parent (user_id, family_id) values (new.id, new_family_id);
  insert into public.subscription (family_id, current_period_end)
    values (new_family_id, now() + interval '14 days');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profils enfants
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.child_profile (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  -- Pseudonyme : le vrai nom de l'enfant n'est jamais stocké sur le serveur.
  alias text not null check (char_length(alias) between 2 and 30),
  avatar text not null default 'lion',
  grade text not null check (grade in (
    'M1', 'M2', 'M3',
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'
  )),
  track text not null default 'general'
    check (track in ('general', 'technique', 'professionnel', 'specialise')),
  network text
    check (network in ('wbe', 'libre_confessionnel', 'officiel_subventionne', 'libre_non_confessionnel')),
  options text[] not null default '{}',
  -- Besoins particuliers : données de santé, soumises au consentement explicite du parent.
  needs text[] not null default '{}'
    check (needs <@ array['tdah', 'dyslexie', 'dyscalculie']),
  needs_consent_at timestamptz,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_profile_needs_consent check (cardinality(needs) = 0 or needs_consent_at is not null),
  -- Le qualifiant (technique, professionnel) commence en S3 ; la S7 n'existe qu'en qualifiant.
  constraint child_profile_track_grade check (
    case
      when track in ('technique', 'professionnel') then grade in ('S3', 'S4', 'S5', 'S6', 'S7')
      else grade <> 'S7'
    end
  ),
  -- Permet aux tables liées de garantir que l'enfant appartient à la même famille.
  unique (id, family_id)
);

create index child_profile_family_id_idx on public.child_profile (family_id);

create trigger child_profile_updated_at
  before update on public.child_profile
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Référentiels FWB (contenu public, en lecture seule)
-- ---------------------------------------------------------------------------

create table public.curriculum_item (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.curriculum_item (id) on delete cascade,
  level text not null check (level in ('maternelle', 'primaire', 'secondaire')),
  grades text[] not null default '{}',
  subject text not null,
  kind text not null check (kind in ('domaine', 'competence', 'attendu')),
  code text,
  label text not null,
  source text not null,
  version text not null,
  created_at timestamptz not null default now()
);

create index curriculum_item_parent_id_idx on public.curriculum_item (parent_id);
create index curriculum_item_grades_idx on public.curriculum_item using gin (grades);

-- ---------------------------------------------------------------------------
-- Numérisations et tâches
-- ---------------------------------------------------------------------------

create table public.scan (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  document_type text check (document_type in ('journal_de_classe', 'notes_de_cours', 'interrogation')),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'draft', 'validated', 'failed')),
  -- Chemin de la photo floutée dans le stockage ; effacé dès la fin du traitement.
  storage_path text,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (id, family_id),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index scan_family_id_idx on public.scan (family_id);
create index scan_child_id_idx on public.scan (child_id);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  scan_id uuid,
  subject text not null,
  kind text not null check (kind in ('devoir', 'lecon', 'interro', 'examen')),
  description text not null,
  due_date date,
  reference text,
  confidence numeric(3, 2) check (confidence between 0 and 1),
  curriculum_item_id uuid references public.curriculum_item (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'validated', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, family_id),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade,
  foreign key (scan_id, family_id) references public.scan (id, family_id) on delete set null (scan_id)
);

create index task_family_id_idx on public.task (family_id);
create index task_child_due_idx on public.task (child_id, due_date);
create index task_scan_id_idx on public.task (scan_id);
create index task_curriculum_item_id_idx on public.task (curriculum_item_id);

create trigger task_updated_at
  before update on public.task
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Planning
-- ---------------------------------------------------------------------------

create table public.study_session (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  scheduled_on date not null,
  duration_minutes integer not null check (duration_minutes between 5 and 180),
  status text not null default 'planned' check (status in ('draft', 'planned', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  unique (id, family_id),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index study_session_family_id_idx on public.study_session (family_id);
create index study_session_child_date_idx on public.study_session (child_id, scheduled_on);

create table public.study_session_task (
  session_id uuid not null,
  task_id uuid not null,
  family_id uuid not null default public.current_family_id(),
  primary key (session_id, task_id),
  foreign key (session_id, family_id) references public.study_session (id, family_id) on delete cascade,
  foreign key (task_id, family_id) references public.task (id, family_id) on delete cascade
);

create index study_session_task_task_id_idx on public.study_session_task (task_id);

-- ---------------------------------------------------------------------------
-- Suivi des coûts de l'IA (écrit uniquement par les fonctions serveur)
-- ---------------------------------------------------------------------------

create table public.ai_usage (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.family (id) on delete cascade,
  function_name text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_family_created_idx on public.ai_usage (family_id, created_at);

-- ---------------------------------------------------------------------------
-- Sécurité par lignes (RLS)
-- ---------------------------------------------------------------------------

alter table public.family enable row level security;
alter table public.parent enable row level security;
alter table public.subscription enable row level security;
alter table public.child_profile enable row level security;
alter table public.curriculum_item enable row level security;
alter table public.scan enable row level security;
alter table public.task enable row level security;
alter table public.study_session enable row level security;
alter table public.study_session_task enable row level security;
alter table public.ai_usage enable row level security;

-- Lecture seule pour le parent : famille, lien parent, abonnement, consommation IA.
create policy "Parent lit sa famille" on public.family
  for select to authenticated using (id = (select public.current_family_id()));

create policy "Parent lit son rattachement" on public.parent
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Parent lit son abonnement" on public.subscription
  for select to authenticated using (family_id = (select public.current_family_id()));

create policy "Parent lit sa consommation" on public.ai_usage
  for select to authenticated using (family_id = (select public.current_family_id()));

-- Le référentiel est public pour tout utilisateur connecté.
create policy "Référentiel lisible" on public.curriculum_item
  for select to authenticated using (true);

-- Accès complet du parent aux données de sa famille.
create policy "Parent gère ses enfants" on public.child_profile
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Parent gère ses numérisations" on public.scan
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Parent gère ses tâches" on public.task
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Parent gère ses sessions" on public.study_session
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Parent gère le contenu de ses sessions" on public.study_session_task
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

-- Le visiteur non connecté n'a accès à rien.
revoke all on all tables in schema public from anon;
revoke execute on function public.current_family_id() from anon, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
grant execute on function public.current_family_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Stockage des photos : compartiment privé, un dossier par famille
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp']);

create policy "Parent dépose ses photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select public.current_family_id())::text
  );

create policy "Parent lit ses photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select public.current_family_id())::text
  );

create policy "Parent supprime ses photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select public.current_family_id())::text
  );
