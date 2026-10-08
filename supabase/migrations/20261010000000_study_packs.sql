-- Étape 2 : paquets d'étude générés par l'IA et cartes de révision à répétition espacée.

create table public.study_pack (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  task_id uuid not null,
  -- Fiche, quiz, exercices et cartes (format : packages/shared/src/study-pack.ts).
  content jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  -- Signalement d'une erreur par le parent (qualité du contenu généré).
  reported_at timestamptz,
  report_reason text check (char_length(report_reason) <= 500),
  unique (task_id),
  unique (id, family_id),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade,
  foreign key (task_id, family_id) references public.task (id, family_id) on delete cascade
);

create index study_pack_family_created_idx on public.study_pack (family_id, created_at);
create index study_pack_child_id_idx on public.study_pack (child_id);

create table public.flashcard (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  pack_id uuid not null,
  front text not null,
  back text not null,
  interval_days integer not null default 0,
  ease numeric(4, 2) not null default 2.5,
  repetitions integer not null default 0,
  due_on date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade,
  foreign key (pack_id, family_id) references public.study_pack (id, family_id) on delete cascade
);

create index flashcard_child_due_idx on public.flashcard (child_id, due_on);
create index flashcard_pack_id_idx on public.flashcard (pack_id);
create index flashcard_family_id_idx on public.flashcard (family_id);

alter table public.study_pack enable row level security;
alter table public.flashcard enable row level security;

-- Les paquets sont créés par la fonction serveur ; le parent peut les lire, les signaler ou les supprimer.
create policy "Parent lit ses paquets" on public.study_pack
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Parent signale un paquet" on public.study_pack
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Parent supprime un paquet" on public.study_pack
  for delete to authenticated using (family_id = (select public.current_family_id()));

-- Seuls le texte du signalement et sa date sont modifiables par le parent.
revoke update on public.study_pack from authenticated;
grant update (reported_at, report_reason) on public.study_pack to authenticated;

create policy "Parent lit les cartes" on public.flashcard
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Révision des cartes" on public.flashcard
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

-- L'enfant ne fait évoluer que l'état de révision d'une carte.
revoke update on public.flashcard from authenticated;
grant update (interval_days, ease, repetitions, due_on, last_reviewed_at) on public.flashcard to authenticated;

revoke all on public.study_pack, public.flashcard from anon;
