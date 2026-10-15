-- Défi des frères et sœurs : un objectif commun à toute la fratrie (« 10 missions à nous tous ») pour une
-- récompense partagée. Pas de classement : seul le total de la famille est montré.
create table public.sibling_challenge (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 60),
  missions_needed integer not null check (missions_needed between 2 and 60),
  created_at timestamptz not null default now(),
  given_at timestamptz
);

-- Un seul défi en cours par famille.
create unique index sibling_challenge_open_idx on public.sibling_challenge (family_id) where given_at is null;

alter table public.sibling_challenge enable row level security;
revoke all on public.sibling_challenge from anon;
revoke truncate, trigger, references on public.sibling_challenge from authenticated;

create policy "Parent gère le défi de la fratrie" on public.sibling_challenge
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

-- Défi en cours et missions faites par toute la fratrie depuis son lancement (parent ou tablette d'un
-- enfant de la famille) : seulement le total, jamais le détail par enfant.
create function public.sibling_challenge_progress()
returns table (id uuid, label text, missions_needed integer, missions_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.label, c.missions_needed,
    (select count(*)::integer from public.learning_event e
     where e.family_id = c.family_id and e.created_at >= c.created_at
       and (e.type = 'session' or (e.type = 'activite' and e.meta ? 'kindergarten')))
  from public.sibling_challenge c
  where c.family_id = coalesce(public.current_family_id(), public.current_device_family_id())
    and c.given_at is null
$$;

revoke execute on function public.sibling_challenge_progress() from anon, public;
grant execute on function public.sibling_challenge_progress() to authenticated;
