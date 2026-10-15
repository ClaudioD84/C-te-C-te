-- « J'ai besoin d'aide » : l'enfant signale une activité difficile, le parent le voit dans son cockpit.
create table public.help_request (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family (id) on delete cascade,
  child_id uuid not null,
  task_id uuid not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade,
  foreign key (task_id, family_id) references public.task (id, family_id) on delete cascade
);

-- Une seule demande ouverte par activité.
create unique index help_request_open_idx on public.help_request (task_id) where resolved_at is null;
create index help_request_family_idx on public.help_request (family_id, resolved_at);
create index help_request_child_idx on public.help_request (child_id);

alter table public.help_request enable row level security;
revoke all on public.help_request from anon;
revoke truncate, trigger, references on public.help_request from authenticated;
revoke update on public.help_request from authenticated;
grant update (resolved_at) on public.help_request to authenticated;

-- Famille déduite de l'enfant (parent sur son téléphone ou tablette de l'enfant).
alter table public.help_request
  alter column family_id set default coalesce(public.current_family_id(), public.current_device_family_id());

create policy "Parent gère les demandes d'aide" on public.help_request
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Appareil demande de l'aide" on public.help_request
  for insert to authenticated
  with check (
    child_id = (select public.current_device_child_id())
    and family_id = (select public.current_device_family_id())
  );
create policy "Appareil voit ses demandes d'aide" on public.help_request
  for select to authenticated using (child_id = (select public.current_device_child_id()));
