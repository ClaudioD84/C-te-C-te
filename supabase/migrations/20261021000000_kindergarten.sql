-- Mode maternelle : activités de la semaine (docs/maternelle/proposition.md).
-- Sans ligne pour une semaine, l'application calcule la proposition (stable pour un enfant et une semaine) ;
-- la ligne n'enregistre que les choix du parent : thème de la classe et activités remplacées.
-- Les activités faites sont inscrites dans learning_event (type « activite », meta.kindergarten).
create table public.kindergarten_week (
  child_id uuid not null,
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  theme text check (char_length(theme) <= 80),
  activity_codes text[] check (activity_codes is null or cardinality(activity_codes) between 1 and 8),
  updated_at timestamptz not null default now(),
  primary key (child_id, week_start),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index kindergarten_week_family_id_idx on public.kindergarten_week (family_id);

create trigger kindergarten_week_updated_at
  before update on public.kindergarten_week
  for each row execute function public.set_updated_at();

alter table public.kindergarten_week enable row level security;

create policy "Parent gère les activités de maternelle" on public.kindergarten_week
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

revoke all on public.kindergarten_week from anon;
revoke truncate, trigger, references on public.kindergarten_week from authenticated;

-- Les activités de maternelle n'ont pas de tâche : leur matière est enregistrée avec l'événement.
create or replace function public.child_subject_stats(p_child_id uuid, p_since date)
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
      coalesce(t.subject, ct.subject, e.meta ->> 'subject') as subject
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

