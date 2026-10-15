-- Cockpit parent avancé (F7, étape 3) : effort et résultats aux quiz par matière depuis une date.
-- La matière vient de la tâche (activités, quiz) ou de la fiche d'où provient la carte (révisions).
-- Sécurité de l'appelant : les règles par ligne limitent le calcul à la famille du parent.
create function public.child_subject_stats(p_child_id uuid, p_since date)
returns table (
  subject text,
  minutes integer,
  activities integer,
  cards integer,
  quizzes integer,
  quiz_score integer,
  quiz_total integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with events as (
    select
      e.type,
      e.meta,
      coalesce(t.subject, ct.subject) as subject
    from public.learning_event e
    left join public.task t
      on e.type in ('activite', 'quiz') and t.id = (e.meta ->> 'task_id')::uuid
    left join public.flashcard f
      on e.type = 'carte' and f.id = (e.meta ->> 'card_id')::uuid
    left join public.study_pack p on p.id = f.pack_id
    left join public.task ct on ct.id = p.task_id
    where e.child_id = p_child_id
      and e.created_at >= (p_since::timestamp at time zone 'Europe/Brussels')
      and e.type in ('activite', 'carte', 'quiz')
  )
  select
    ev.subject,
    coalesce(sum((ev.meta ->> 'minutes')::integer) filter (where ev.type = 'activite'), 0)::integer,
    count(*) filter (where ev.type = 'activite')::integer,
    count(*) filter (where ev.type = 'carte')::integer,
    count(*) filter (where ev.type = 'quiz')::integer,
    coalesce(sum((ev.meta ->> 'score')::integer) filter (where ev.type = 'quiz'), 0)::integer,
    coalesce(sum((ev.meta ->> 'total')::integer) filter (where ev.type = 'quiz'), 0)::integer
  from events ev
  where ev.subject is not null
  group by ev.subject;
$$;

revoke execute on function public.child_subject_stats(uuid, date) from anon, public;
grant execute on function public.child_subject_stats(uuid, date) to authenticated;
