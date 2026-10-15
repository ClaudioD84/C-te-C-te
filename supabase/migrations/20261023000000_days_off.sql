-- Congés et absences d'un enfant : le planning ne prévoit aucun travail ces jours-là.
create table public.day_off (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  start_date date not null,
  end_date date not null,
  kind text not null default 'conge' check (kind in ('conge', 'absence', 'activite')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 92),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index day_off_child_idx on public.day_off (child_id, end_date);
create index day_off_family_id_idx on public.day_off (family_id);

alter table public.day_off enable row level security;
revoke all on public.day_off from anon;
revoke truncate, trigger, references on public.day_off from authenticated;

create policy "Parent gère les congés" on public.day_off
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
