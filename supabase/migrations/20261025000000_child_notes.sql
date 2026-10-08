-- Petit mot du parent à l'enfant, affiché sur sa console (et sa tablette).
create table public.child_note (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  message text not null check (char_length(btrim(message)) between 1 and 200),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index child_note_child_idx on public.child_note (child_id, created_at desc);
create index child_note_family_id_idx on public.child_note (family_id);

alter table public.child_note enable row level security;
revoke all on public.child_note from anon;
revoke truncate, trigger, references on public.child_note from authenticated;
-- Une fois envoyé, le mot ne change plus : seule sa lecture est enregistrée.
revoke update on public.child_note from authenticated;
grant update (seen_at) on public.child_note to authenticated;

create policy "Parent gère les petits mots" on public.child_note
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Appareil lit les petits mots" on public.child_note
  for select to authenticated using (child_id = (select public.current_device_child_id()));
create policy "Appareil marque un petit mot comme lu" on public.child_note
  for update to authenticated
  using (child_id = (select public.current_device_child_id()))
  with check (child_id = (select public.current_device_child_id()));

-- La tablette sait si l'enfant est en congé (message de vacances sur sa console).
create policy "Appareil lit les congés" on public.day_off
  for select to authenticated using (child_id = (select public.current_device_child_id()));
