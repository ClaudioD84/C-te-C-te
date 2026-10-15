-- Détail des sessions de travail : durée et activité par tâche, suivi de ce que l'enfant a fait.
alter table public.study_session_task
  add column minutes integer not null default 15 check (minutes between 5 and 180),
  add column activity text not null default 'faire'
    check (activity in ('faire', 'etudier', 'reviser', 'se_tester')),
  add column done_at timestamptz;

-- Une seule session par enfant et par jour.
alter table public.study_session add constraint study_session_child_day_unique unique (child_id, scheduled_on);

-- Publication d'un planning : remplace les sessions à venir d'un enfant, en une seule transaction.
-- Ce que l'enfant a déjà fait est conservé. SECURITY INVOKER : les règles RLS du parent s'appliquent.
create function public.publish_plan(p_child_id uuid, p_from date, p_days jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_day jsonb;
  v_item jsonb;
  v_session_id uuid;
begin
  delete from public.study_session_task st
    using public.study_session s
    where st.session_id = s.id
      and s.child_id = p_child_id
      and s.scheduled_on >= p_from
      and st.done_at is null;

  delete from public.study_session s
    where s.child_id = p_child_id
      and s.scheduled_on >= p_from
      and not exists (select 1 from public.study_session_task st where st.session_id = s.id);

  for v_day in select * from jsonb_array_elements(p_days) loop
    insert into public.study_session (child_id, scheduled_on, duration_minutes, status)
      values (p_child_id, (v_day ->> 'date')::date, least(greatest((v_day ->> 'totalMinutes')::int, 5), 180), 'planned')
      on conflict (child_id, scheduled_on)
        do update set duration_minutes = excluded.duration_minutes, status = 'planned'
      returning id into v_session_id;

    for v_item in select * from jsonb_array_elements(v_day -> 'items') loop
      insert into public.study_session_task (session_id, task_id, minutes, activity)
        values (v_session_id, (v_item ->> 'taskId')::uuid, (v_item ->> 'minutes')::int, v_item ->> 'activity')
        on conflict (session_id, task_id) do nothing;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.publish_plan(uuid, date, jsonb) from anon, public;
grant execute on function public.publish_plan(uuid, date, jsonb) to authenticated;
