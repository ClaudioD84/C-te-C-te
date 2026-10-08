-- Photos de dictée corrigée et de listes de vocabulaire (français et langues).
-- Dictée : les mots à revoir sont rangés dans spelling_words (forme correcte) ; le parent les ajoute à la
-- dictée de la semaine. Vocabulaire : la liste lue sur la photo ; le parent en fait des cartes de révision.

alter table public.scan drop constraint scan_document_type_check;
alter table public.scan add constraint scan_document_type_check check (
  document_type in ('journal_de_classe', 'notes_de_cours', 'interrogation', 'dictee', 'vocabulaire')
);

-- Écrites uniquement par la fonction serveur, comme spelling_words.
alter table public.scan
  add column vocabulary jsonb
    check (vocabulary is null or (jsonb_typeof(vocabulary) = 'array' and jsonb_array_length(vocabulary) between 1 and 60)),
  add column vocabulary_subject text check (char_length(vocabulary_subject) between 1 and 40),
  -- Tâche « Étudier le vocabulaire » créée à partir de cette photo (une seule fois).
  add column vocabulary_task_id uuid references public.task (id) on delete set null;

/**
 * Cartes de révision d'une liste photographiée : une tâche « Étudier le vocabulaire » rattachée à la photo
 * (en brouillon tant que la liste n'est pas validée), un paquet d'étude sans IA et ses cartes. Les cartes sont
 * préparées par l'application (recto en français pour une langue) et revérifiées ici.
 */
create function public.create_vocabulary_cards(
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

  insert into public.flashcard (family_id, child_id, pack_id, front, back)
  select v_family, v_scan.child_id, v_pack, btrim(c ->> 'front'), btrim(c ->> 'back')
  from jsonb_array_elements(p_cards) c;

  update public.scan set vocabulary_task_id = v_task where id = v_scan.id;
  return v_task;
end;
$$;

revoke all on function public.create_vocabulary_cards(uuid, text, jsonb, date) from public, anon;
grant execute on function public.create_vocabulary_cards(uuid, text, jsonb, date) to authenticated;
