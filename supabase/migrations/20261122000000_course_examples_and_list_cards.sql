-- Fiches plus proches du cours, préparées seulement quand elles servent.
--
-- 1. Exemples de l'enseignant : à la lecture d'une interrogation ou de notes de cours, quelques questions ou
--    consignes représentatives (telles qu'écrites, sans nom ni note) sont gardées avec la tâche. Les fiches du même
--    cours s'en servent pour reprendre le niveau et les types d'exercices de l'enseignant.

-- Vrai si chaque élément fait au plus `max_length` caractères.
create function public.text_items_max_length(items text[], max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(char_length(i) <= max_length), true) from unnest(items) as i;
$$;

alter table public.task
  add column examples text[] not null default '{}'
    check (cardinality(examples) <= 5 and public.text_items_max_length(examples, 200));

-- 2. Cartes d'une liste de vocabulaire photographiée : gardées (avec la progression de l'enfant) quand l'IA
--    complète la liste d'un quiz, d'exercices et de cartes de phrases.
alter table public.flashcard add column from_list boolean not null default false;

update public.flashcard f
  set from_list = true
  from public.study_pack p
  where p.id = f.pack_id and p.model = 'liste-photographiee';

create or replace function public.create_vocabulary_cards(
  p_scan_id uuid,
  p_subject text,
  p_cards jsonb,
  p_due date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := public.current_family_id();
  v_scan public.scan;
  v_task uuid;
  v_pack uuid;
  v_count integer;
  v_subject text := btrim(p_subject);
begin
  if v_family is null then
    raise exception 'Réservé aux parents.';
  end if;
  select * into v_scan from public.scan where id = p_scan_id and family_id = v_family for update;
  if not found then
    raise exception 'Photo introuvable.';
  end if;
  if v_scan.vocabulary_task_id is not null then
    raise exception 'Les cartes de cette liste ont déjà été créées.';
  end if;
  if char_length(v_subject) not between 1 and 40 then
    raise exception 'Matière invalide.';
  end if;
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Cartes invalides.';
  end if;
  v_count := jsonb_array_length(p_cards);
  if v_count not between 1 and 60 or exists (
    select 1 from jsonb_array_elements(p_cards) c
    where jsonb_typeof(c -> 'front') <> 'string' or jsonb_typeof(c -> 'back') <> 'string'
      or char_length(btrim(c ->> 'front')) not between 1 and 200
      or char_length(btrim(c ->> 'back')) not between 1 and 200
  ) then
    raise exception 'Cartes invalides.';
  end if;

  insert into public.task (family_id, child_id, scan_id, subject, kind, description, due_date, confidence, status)
  values (
    v_family, v_scan.child_id, v_scan.id, v_subject, 'lecon',
    format('Étudier le vocabulaire (%s mots)', v_count), p_due, 1,
    case when v_scan.status = 'validated' then 'validated' else 'draft' end
  )
  returning id into v_task;

  insert into public.study_pack (family_id, child_id, task_id, model, content)
  values (
    v_family, v_scan.child_id, v_task, 'liste-photographiee',
    jsonb_build_object(
      'topicUnclear', false,
      'fiche', jsonb_build_object(
        'title', 'Vocabulaire : ' || v_subject,
        'sections', jsonb_build_array(jsonb_build_object(
          'heading', 'Les mots à connaître',
          'points', (select jsonb_agg(btrim(c ->> 'front') || ' → ' || btrim(c ->> 'back')) from jsonb_array_elements(p_cards) c)
        )),
        'keyTerms', '[]'::jsonb
      ),
      'quiz', '[]'::jsonb,
      'exercises', '[]'::jsonb,
      'flashcards', (
        select jsonb_agg(jsonb_build_object('front', btrim(c ->> 'front'), 'back', btrim(c ->> 'back')))
        from jsonb_array_elements(p_cards) c
      )
    )
  )
  returning id into v_pack;

  insert into public.flashcard (family_id, child_id, pack_id, front, back, from_list)
  select v_family, v_scan.child_id, v_pack, btrim(c ->> 'front'), btrim(c ->> 'back'), true
  from jsonb_array_elements(p_cards) c;

  update public.scan set vocabulary_task_id = v_task where id = v_scan.id;
  return v_task;
end;
$$;
