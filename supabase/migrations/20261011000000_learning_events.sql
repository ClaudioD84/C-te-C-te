-- Étape 3 : journal de l'effort de l'enfant, base de la gamification (F11) et du cockpit parent (F7).

create table public.learning_event (
  id bigint generated always as identity primary key,
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  type text not null check (type in ('activite', 'carte', 'quiz', 'session')),
  -- activite : { task_id, minutes } ; carte : { card_id, rating } ; quiz : { task_id, score, total } ; session : { session_id }
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index learning_event_child_created_idx on public.learning_event (child_id, created_at);
create index learning_event_family_id_idx on public.learning_event (family_id);

alter table public.learning_event enable row level security;

create policy "Famille lit ses événements" on public.learning_event
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Famille ajoute ses événements" on public.learning_event
  for insert to authenticated with check (family_id = (select public.current_family_id()));

revoke all on public.learning_event from anon;
revoke update, delete on public.learning_event from authenticated;

-- Effort par jour (heure de Bruxelles) sur l'année écoulée : au plus 366 lignes, quelle que soit l'activité.
-- « recovered » : cartes réussies (facile) après avoir été oubliées auparavant.
create function public.child_effort_days(p_child_id uuid)
returns table (
  date date,
  activities integer,
  cards integer,
  quizzes integer,
  sessions integer,
  recovered integer,
  minutes integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with events as (
    select e.*, (e.created_at at time zone 'Europe/Brussels')::date as day
    from public.learning_event e
    where e.child_id = p_child_id
      and e.created_at > now() - interval '366 days'
  )
  select
    ev.day,
    count(*) filter (where ev.type = 'activite')::integer,
    count(*) filter (where ev.type = 'carte')::integer,
    count(*) filter (where ev.type = 'quiz')::integer,
    count(*) filter (where ev.type = 'session')::integer,
    count(*) filter (
      where ev.type = 'carte'
        and ev.meta ->> 'rating' = 'facile'
        and exists (
          select 1 from events earlier
          where earlier.type = 'carte'
            and earlier.meta ->> 'card_id' = ev.meta ->> 'card_id'
            and earlier.meta ->> 'rating' = 'oublie'
            and earlier.created_at < ev.created_at
        )
    )::integer,
    coalesce(sum((ev.meta ->> 'minutes')::integer) filter (where ev.type = 'activite'), 0)::integer
  from events ev
  group by ev.day
  order by ev.day;
$$;

revoke execute on function public.child_effort_days(uuid) from anon, public;
grant execute on function public.child_effort_days(uuid) to authenticated;
