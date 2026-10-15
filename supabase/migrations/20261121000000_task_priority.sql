-- Priorité d'une tâche, choisie par le parent dans le planning : « haute » (commencée au plus tôt, jamais reportée),
-- « normale », ou « basse » (faite près de son échéance, reportée en premier quand la semaine est chargée).

alter table public.task
  add column priority text not null default 'normale' check (priority in ('haute', 'normale', 'basse'));

comment on column public.task.priority is
  'Priorité donnée par le parent pour le planning : haute, normale ou basse.';
