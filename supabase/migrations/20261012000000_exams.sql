-- Étape 3 : épreuves à préparer (CEB, CE1D, CESS, bilans) et tâches de révision associées (F5).

create table public.exam (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  type text not null check (type in ('ceb', 'ce1d', 'cess', 'bilan')),
  exam_date date not null,
  subjects text[] not null check (cardinality(subjects) between 1 and 12),
  created_at timestamptz not null default now(),
  unique (id, family_id),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index exam_child_id_idx on public.exam (child_id);
create index exam_family_id_idx on public.exam (family_id);

alter table public.task add column exam_id uuid;
alter table public.task
  add constraint task_exam_fkey foreign key (exam_id, family_id) references public.exam (id, family_id) on delete cascade;
create index task_exam_id_idx on public.task (exam_id);

alter table public.exam enable row level security;
create policy "Parent gère ses épreuves" on public.exam
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
revoke all on public.exam from anon;
