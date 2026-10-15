-- Étape 3 : base de contenus culturels vérifiés (F6), en lecture seule pour les familles.
create table public.cultural_resource (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('documentaire', 'musee', 'sortie', 'livre', 'jeu', 'site')),
  title text not null,
  description text not null check (char_length(description) <= 400),
  url text,
  place text,
  subjects text[] not null,
  grades text[] not null,
  verified_on date not null,
  created_at timestamptz not null default now()
);

create index cultural_resource_grades_idx on public.cultural_resource using gin (grades);
create index cultural_resource_subjects_idx on public.cultural_resource using gin (subjects);

alter table public.cultural_resource enable row level security;
create policy "Contenus culturels lisibles" on public.cultural_resource for select to authenticated using (true);
revoke all on public.cultural_resource from anon;
