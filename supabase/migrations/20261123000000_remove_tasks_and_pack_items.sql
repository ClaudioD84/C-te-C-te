-- Le parent fait le tri : retirer une tâche du planning, retirer une question, un exercice ou une carte d'une fiche.

-- Tâche retirée : « supprimer » (créée par erreur : la tâche, sa fiche, ses cartes et ses activités disparaissent)
-- ou « fait » (déjà faite en dehors de l'application : gardée dans l'historique, retirée des séances à venir).
-- Les séances à venir devenues vides disparaissent ; les autres gardent une durée juste.
create function public.remove_task(p_task_id uuid, p_mode text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_child uuid;
  v_today date := (now() at time zone 'Europe/Brussels')::date;
begin
  if p_mode not in ('supprimer', 'fait') then
    raise exception 'Choix invalide.';
  end if;
  select child_id into v_child from public.task where id = p_task_id;
  if not found then
    raise exception 'Tâche introuvable.';
  end if;

  if p_mode = 'supprimer' then
    delete from public.task where id = p_task_id;
  else
    update public.task set status = 'done' where id = p_task_id;
    delete from public.study_session_task st
      using public.study_session s
      where st.session_id = s.id
        and st.task_id = p_task_id
        and st.done_at is null
        and s.scheduled_on >= v_today;
  end if;

  delete from public.study_session s
    where s.child_id = v_child
      and s.scheduled_on >= v_today
      and not exists (select 1 from public.study_session_task st where st.session_id = s.id);
  update public.study_session s
    set duration_minutes = least(greatest(totals.minutes, 5), 180)
    from (
      select st.session_id, sum(st.minutes)::integer as minutes
      from public.study_session_task st
      group by st.session_id
    ) totals
    where totals.session_id = s.id
      and s.child_id = v_child
      and s.scheduled_on >= v_today;
end;
$$;

revoke all on function public.remove_task(uuid, text) from public, anon;
grant execute on function public.remove_task(uuid, text) to authenticated;

-- Élément retiré d'une fiche : une question du quiz, un exercice ou une carte (avec sa carte de révision).
-- Le contenu n'est modifiable que par cette fonction : `p_expected` (le texte de l'élément) évite de retirer le
-- mauvais élément si la fiche a changé entre-temps. Une fiche retouchée n'est plus réutilisée pour d'autres familles
-- (elle n'est plus seulement écrite par l'IA) : son empreinte de demande est effacée.
create function public.remove_pack_item(p_pack_id uuid, p_part text, p_index integer, p_expected text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pack public.study_pack;
  v_items jsonb;
  v_item jsonb;
begin
  if p_part not in ('quiz', 'exercises', 'flashcards') then
    raise exception 'Élément invalide.';
  end if;
  select * into v_pack
    from public.study_pack
    where id = p_pack_id and family_id = public.current_family_id()
    for update;
  if not found then
    raise exception 'Fiche introuvable.';
  end if;

  v_items := v_pack.content -> p_part;
  if jsonb_typeof(v_items) is distinct from 'array' or p_index < 0 or p_index >= jsonb_array_length(v_items) then
    raise exception 'Élément introuvable.';
  end if;
  v_item := v_items -> p_index;
  if (case p_part
        when 'quiz' then v_item ->> 'question'
        when 'exercises' then v_item ->> 'prompt'
        else v_item ->> 'front'
      end) is distinct from p_expected then
    raise exception 'La fiche a changé : rouvrez-la puis réessayez.';
  end if;

  update public.study_pack
    set content = jsonb_set(content, array[p_part], v_items - p_index), request_key = null
    where id = p_pack_id;
  if p_part = 'flashcards' then
    delete from public.flashcard
      where pack_id = p_pack_id and front = v_item ->> 'front' and back = v_item ->> 'back';
  end if;
end;
$$;

revoke all on function public.remove_pack_item(uuid, text, integer, text) from public, anon;
grant execute on function public.remove_pack_item(uuid, text, integer, text) to authenticated;
