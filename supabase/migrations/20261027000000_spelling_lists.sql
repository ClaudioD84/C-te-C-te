-- Dictée préparée : les mots de la semaine recopiés par le parent, pour l'entraînement « Écoute et écris ».
create table public.spelling_list (
  child_id uuid not null,
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  words text[] not null check (cardinality(words) between 1 and 40),
  updated_at timestamptz not null default now(),
  primary key (child_id, week_start),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index spelling_list_family_id_idx on public.spelling_list (family_id);

alter table public.spelling_list enable row level security;
revoke all on public.spelling_list from anon;
revoke truncate, trigger, references on public.spelling_list from authenticated;

create policy "Parent gère les dictées" on public.spelling_list
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Appareil lit les dictées" on public.spelling_list
  for select to authenticated using (child_id = (select public.current_device_child_id()));
