-- Coin détente : le temps passé dans les petits jeux est noté (type « detente », meta { minutes, game })
-- pour que le parent le voie et que la limite par jour vaille sur tous les appareils. Ce n'est pas du
-- travail : il ne compte ni dans l'effort, ni dans les récompenses, ni dans les minutes de travail.

alter table public.learning_event drop constraint learning_event_type_check;
alter table public.learning_event add constraint learning_event_type_check
  check (type in ('activite', 'carte', 'quiz', 'session', 'detente'));

create or replace function public.child_effort_days(p_child_id uuid)
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
      and e.type <> 'detente'
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
