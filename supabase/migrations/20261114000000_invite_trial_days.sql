-- Bêta : un code d'invitation peut offrir un essai plus long (les testeurs n'ont pas d'abonnement à payer
-- pendant le test). Sans code, l'essai reste de 14 jours.

alter table public.invite_code
  add column trial_days integer not null default 14 check (trial_days between 1 and 365);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
  v_code text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  v_trial_days integer := 14;
begin
  -- Compte d'appareil (créé par pair-device) : reconnu à son domaine réservé, car app_metadata n'est
  -- pas encore renseigné à l'insertion. Une inscription publique avec ce domaine n'obtient aucun droit.
  if new.email like '%@appareils.coteacote.invalid' then
    return new;
  end if;
  if exists (select 1 from public.invite_code) then
    update public.invite_code
      set uses = uses + 1
      where code = v_code and uses < max_uses and (expires_at is null or expires_at > now())
      returning trial_days into v_trial_days;
    if not found then
      raise exception 'code_invitation_invalide' using errcode = 'P0001';
    end if;
  end if;
  insert into public.family default values returning id into new_family_id;
  insert into public.parent (user_id, family_id) values (new.id, new_family_id);
  insert into public.subscription (family_id, current_period_end)
    values (new_family_id, now() + make_interval(days => v_trial_days));
  return new;
end;
$$;
