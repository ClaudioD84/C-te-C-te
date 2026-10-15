-- Revue de sécurité (octobre 2026).

-- 1. Deux appels simultanés pour la même famille : le second ne doit pas boucler (conflit sur la famille,
--    pas sur le code) ; il renvoie le code déjà créé.
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid := public.current_family_id();
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
begin
  if v_family_id is null then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  for attempt in 1..10 loop
    select code into v_code from public.referral_code where family_id = v_family_id;
    if v_code is not null then
      return v_code;
    end if;
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    insert into public.referral_code (family_id, code) values (v_family_id, v_code)
      on conflict do nothing;
    v_code := null;
  end loop;
  raise exception 'Code de parrainage non créé' using errcode = 'P0001';
end;
$$;

-- 2. Une demande d'aide porte sur une tâche de l'enfant concerné (pas d'un frère ou d'une sœur).
create function public.help_request_task_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.task where id = new.task_id and child_id = new.child_id) then
    raise exception 'Tâche d''un autre enfant' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger help_request_task_guard
  before insert on public.help_request
  for each row execute function public.help_request_task_guard();

revoke execute on function public.help_request_task_guard() from anon, authenticated, public;
