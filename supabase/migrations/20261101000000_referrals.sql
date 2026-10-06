-- Parrainage : une famille partage son code ; la nouvelle famille et la marraine gagnent 30 jours.
-- Pendant l'essai, le mois est ajouté directement. Pour un abonnement payé (App Store, Google Play),
-- la récompense est notée « à créditer » (promotion RevenueCat, à accorder lors de la configuration).

create table public.referral_code (
  family_id uuid primary key references public.family (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

create table public.referral (
  id uuid primary key default gen_random_uuid(),
  referrer_family_id uuid references public.family (id) on delete set null,
  -- Une famille n'est parrainée qu'une fois.
  referee_family_id uuid not null unique references public.family (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer_rewarded boolean not null default false,
  referrer_reward_pending boolean not null default false
);

create index referral_referrer_idx on public.referral (referrer_family_id);

alter table public.referral_code enable row level security;
alter table public.referral enable row level security;
revoke all on public.referral_code, public.referral from anon;
revoke insert, update, delete, truncate, trigger, references on public.referral_code, public.referral from authenticated;

create policy "Famille lit son code de parrainage" on public.referral_code
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Famille voit ses parrainages" on public.referral
  for select to authenticated
  using (
    referrer_family_id = (select public.current_family_id())
    or referee_family_id = (select public.current_family_id())
  );

-- Code de la famille (créé à la première demande).
create function public.my_referral_code()
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
  select code into v_code from public.referral_code where family_id = v_family_id;
  while v_code is null loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    begin
      insert into public.referral_code (family_id, code) values (v_family_id, v_code);
    exception when unique_violation then
      v_code := null;
    end;
  end loop;
  return v_code;
end;
$$;

-- Utiliser le code d'une autre famille. Renvoie 'ok' ou la raison du refus (sans exception, pour que
-- l'essai erroné reste compté) : 'invalide', 'trop_essais', 'propre_code', 'deja_parraine', 'trop_tard'.
create function public.redeem_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_family uuid := public.current_family_id();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_referrer uuid;
  v_referrer_sub public.subscription%rowtype;
  v_rewards integer;
begin
  if v_family is null then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  if (select count(*) from public.family_join_failure
      where user_id = v_user and created_at > now() - interval '15 minutes') >= 10 then
    return 'trop_essais';
  end if;
  select family_id into v_referrer from public.referral_code where code = v_code;
  if v_referrer is null then
    insert into public.family_join_failure (user_id) values (v_user);
    return 'invalide';
  end if;
  if v_referrer = v_family then
    return 'propre_code';
  end if;
  if exists (select 1 from public.referral where referee_family_id = v_family) then
    return 'deja_parraine';
  end if;
  -- Seulement pour une nouvelle famille (créée il y a moins de 30 jours).
  if (select created_at from public.family where id = v_family) < now() - interval '30 days' then
    return 'trop_tard';
  end if;

  -- Nouvelle famille : 30 jours de plus sur l'essai (ou l'abonnement en cours).
  update public.subscription
  set current_period_end = greatest(current_period_end, now()) + interval '30 days', updated_at = now()
  where family_id = v_family and status = 'trial';

  -- Marraine : 30 jours ajoutés pendant l'essai ; sinon récompense à créditer (10 par an au plus).
  select count(*) into v_rewards from public.referral
  where referrer_family_id = v_referrer and created_at > now() - interval '1 year'
    and (referrer_rewarded or referrer_reward_pending);
  select * into v_referrer_sub from public.subscription where family_id = v_referrer;
  if v_rewards < 10 and v_referrer_sub.status = 'trial' then
    update public.subscription
    set current_period_end = greatest(current_period_end, now()) + interval '30 days', updated_at = now()
    where family_id = v_referrer;
    insert into public.referral (referrer_family_id, referee_family_id, referrer_rewarded)
      values (v_referrer, v_family, true);
  else
    insert into public.referral (referrer_family_id, referee_family_id, referrer_reward_pending)
      values (v_referrer, v_family, v_rewards < 10);
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.my_referral_code() from anon, public;
revoke execute on function public.redeem_referral(text) from anon, public;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.redeem_referral(text) to authenticated;
