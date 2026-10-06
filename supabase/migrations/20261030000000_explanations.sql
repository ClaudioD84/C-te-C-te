-- « Explique-le moi autrement » : autre explication d'une partie de fiche, gardée pour ne la payer qu'une fois.
create table public.explanation (
  pack_id uuid not null references public.study_pack (id) on delete cascade,
  section_index integer not null check (section_index between 0 and 50),
  family_id uuid not null references public.family (id) on delete cascade,
  child_id uuid not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (pack_id, section_index),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index explanation_family_id_idx on public.explanation (family_id);
create index explanation_child_id_idx on public.explanation (child_id);

alter table public.explanation enable row level security;
-- Écrite uniquement par la fonction explain-again.
revoke all on public.explanation from anon;
revoke insert, update, delete, truncate, trigger, references on public.explanation from authenticated;

create policy "Parent lit les explications" on public.explanation
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Appareil lit les explications" on public.explanation
  for select to authenticated using (child_id = (select public.current_device_child_id()));
