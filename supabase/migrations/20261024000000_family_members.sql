-- Plusieurs parents dans une famille (coparentalité, grand-parent…) : invitation par code à usage unique.
-- Chaque parent garde son propre compte ; la famille, ses enfants et l'abonnement sont partagés.

create table public.family_invitation (
  code_hash text primary key,
  family_id uuid not null references public.family (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days'
);

create index family_invitation_family_id_idx on public.family_invitation (family_id);

-- Codes erronés par utilisateur : au-delà de 10 en 15 minutes, les essais sont refusés.
create table public.family_join_failure (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index family_join_failure_user_idx on public.family_join_failure (user_id, created_at);

alter table public.family_invitation enable row level security;
alter table public.family_join_failure enable row level security;
revoke all on public.family_invitation, public.family_join_failure from anon, authenticated;

-- Le parent crée un code (3 en cours au plus) à transmettre à l'autre adulte.
create function public.create_family_invitation()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid := public.current_family_id();
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_code text := '';
begin
  if v_family_id is null then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  delete from public.family_invitation where family_id = v_family_id and expires_at < now();
  if (select count(*) from public.family_invitation where family_id = v_family_id) >= 3 then
    raise exception 'Trois invitations sont déjà en cours. Réessayez plus tard.' using errcode = 'P0001';
  end if;
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;
  insert into public.family_invitation (code_hash, family_id)
    values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_family_id);
  return v_code;
end;
$$;

-- Nouvelle famille vide pour un parent qui quitte la sienne (sans nouvel essai gratuit).
create function public.move_parent_to_new_family(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  insert into public.family default values returning id into v_family_id;
  insert into public.subscription (family_id, current_period_end) values (v_family_id, now());
  update public.parent set family_id = v_family_id where user_id = p_user_id;
end;
$$;

-- Rejoindre la famille d'un autre parent. Renvoie 'ok' ou la raison du refus (sans exception, pour que
-- l'essai erroné reste compté) : 'invalide', 'trop_essais', 'deja_membre', 'enfants', 'abonnement', 'complet'.
create function public.join_family(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current uuid := public.current_family_id();
  v_target uuid;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
begin
  if v_current is null then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  if (select count(*) from public.family_join_failure
      where user_id = v_user and created_at > now() - interval '15 minutes') >= 10 then
    return 'trop_essais';
  end if;

  select family_id into v_target from public.family_invitation
  where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex') and expires_at > now();
  if v_target is null then
    insert into public.family_join_failure (user_id) values (v_user);
    return 'invalide';
  end if;
  if v_target = v_current then
    return 'deja_membre';
  end if;
  -- La famille quittée doit être vide : ses enfants ne sont jamais fusionnés ni perdus.
  if exists (select 1 from public.child_profile where family_id = v_current) then
    return 'enfants';
  end if;
  if exists (select 1 from public.subscription
             where family_id = v_current and status = 'active' and plan in ('solo', 'famille')) then
    return 'abonnement';
  end if;
  if (select count(*) from public.parent where family_id = v_target) >= 4 then
    return 'complet';
  end if;

  delete from public.family_invitation where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex');
  update public.parent set family_id = v_target where user_id = v_user;
  -- L'ancienne famille, vide, disparaît.
  if not exists (select 1 from public.parent where family_id = v_current) then
    delete from public.family where id = v_current;
  end if;
  return 'ok';
end;
$$;

-- Parents de la famille (adresse e-mail pour se reconnaître).
create function public.family_members()
returns table (user_id uuid, email text, joined_at timestamptz, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, u.email::text, p.created_at, p.user_id = auth.uid()
  from public.parent p
  join auth.users u on u.id = p.user_id
  where p.family_id = public.current_family_id()
  order by p.created_at
$$;

-- Quitter la famille (soi-même) ou en retirer un autre parent : il repart avec une famille vide.
-- Le dernier parent ne peut pas partir (il supprime son compte s'il le souhaite).
create function public.leave_family(p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid := public.current_family_id();
  v_target uuid := coalesce(p_user_id, auth.uid());
begin
  if v_family_id is null
    or not exists (select 1 from public.parent where user_id = v_target and family_id = v_family_id) then
    raise exception 'Parent introuvable' using errcode = '42501';
  end if;
  if (select count(*) from public.parent where family_id = v_family_id) < 2 then
    raise exception 'Vous êtes le seul parent de cette famille.' using errcode = 'P0001';
  end if;
  perform public.move_parent_to_new_family(v_target);
end;
$$;

revoke execute on function public.create_family_invitation() from anon, public;
revoke execute on function public.join_family(text) from anon, public;
revoke execute on function public.family_members() from anon, public;
revoke execute on function public.leave_family(uuid) from anon, public;
revoke execute on function public.move_parent_to_new_family(uuid) from anon, authenticated, public;
grant execute on function public.create_family_invitation() to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.family_members() to authenticated;
grant execute on function public.leave_family(uuid) to authenticated;
