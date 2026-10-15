-- Plan de blocus : l'enfant révise aussi le week-end jusqu'à ses examens (le planning de la semaine ajoute
-- alors le samedi et le dimanche).
alter table public.exam add column weekend_work boolean not null default false;

-- Points d'effort de l'enfant (même calcul que l'application, packages/shared/src/rewards.ts : dayPoints).
create function public.child_effort_points(p_child_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(activities * 10 + cards + quizzes * 5 + sessions * 10 + recovered * 3), 0)::integer
  from public.child_effort_days(p_child_id)
$$;

revoke execute on function public.child_effort_points(uuid) from anon, public;
grant execute on function public.child_effort_points(uuid) to authenticated;

-- Fonds à débloquer : vérifiés aussi par le serveur (seuils des stades de l'avatar : Jeune plante 200,
-- Arbre 1000 points ; packages/shared/src/rewards.ts AVATAR_STAGES).
create or replace function public.set_child_background(p_child_id uuid, p_background text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_needed integer := case p_background when 'arc_en_ciel' then 200 when 'aurore' then 1000 else 0 end;
begin
  if not exists (
    select 1 from public.child_profile c
    where c.id = p_child_id
      and (c.family_id = public.current_family_id() or c.id = public.current_device_child_id())
  ) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  if v_needed > 0 and public.child_effort_points(p_child_id) < v_needed then
    raise exception 'Fond pas encore débloqué' using errcode = 'P0001';
  end if;
  update public.child_profile set background = p_background where id = p_child_id;
end;
$$;
