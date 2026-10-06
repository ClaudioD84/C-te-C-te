-- Moment-récompense en famille : le parent choisit une récompense réelle (un moment ensemble, un choix…),
-- gagnée après un nombre de missions accomplies. C'est le parent qui la « donne ».
create table public.family_reward (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  label text not null check (char_length(btrim(label)) between 2 and 60),
  missions_needed integer not null check (missions_needed between 1 and 30),
  created_at timestamptz not null default now(),
  given_at timestamptz,
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

-- Une seule récompense en cours par enfant.
create unique index family_reward_open_idx on public.family_reward (child_id) where given_at is null;
create index family_reward_family_id_idx on public.family_reward (family_id);

alter table public.family_reward enable row level security;
revoke all on public.family_reward from anon;
revoke truncate, trigger, references on public.family_reward from authenticated;

create policy "Parent gère les récompenses" on public.family_reward
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Appareil voit sa récompense" on public.family_reward
  for select to authenticated using (child_id = (select public.current_device_child_id()));

-- Missions accomplies depuis une date : séances terminées, et activités de maternelle faites.
create function public.missions_done_since(p_child_id uuid, p_since timestamptz)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer from public.learning_event
  where child_id = p_child_id and created_at >= p_since
    and (type = 'session' or (type = 'activite' and meta ? 'kindergarten'))
$$;

revoke execute on function public.missions_done_since(uuid, timestamptz) from anon, public;
grant execute on function public.missions_done_since(uuid, timestamptz) to authenticated;
