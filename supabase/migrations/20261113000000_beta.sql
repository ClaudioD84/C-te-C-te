-- Bêta privée : codes d'invitation, avis des testeurs, journal des erreurs de l'application et mesures d'usage.

-- ---------------------------------------------------------------------------
-- Codes d'invitation : tant qu'au moins un code existe, l'inscription d'un parent en demande un valide.
-- Table vide (développement, après le lancement public) : inscription libre.
-- ---------------------------------------------------------------------------

create table public.invite_code (
  code text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  -- Pour s'y retrouver : « école Saint-Joseph », « famille test 1 »… (jamais de donnée d'un enfant).
  note text check (char_length(note) <= 100),
  max_uses integer not null default 1 check (max_uses between 1 and 1000),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Seul le serveur (clé de service, script) gère les codes.
alter table public.invite_code enable row level security;
revoke all on public.invite_code from anon, authenticated;

/** L'écran d'inscription doit-il demander un code ? */
create function public.signup_requires_code()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.invite_code)
$$;

revoke all on function public.signup_requires_code() from public;
grant execute on function public.signup_requires_code() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
  v_code text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
begin
  -- Compte d'appareil (créé par pair-device) : reconnu à son domaine réservé, car app_metadata n'est
  -- pas encore renseigné à l'insertion. Une inscription publique avec ce domaine n'obtient aucun droit.
  if new.email like '%@appareils.coteacote.invalid' then
    return new;
  end if;
  if exists (select 1 from public.invite_code) then
    update public.invite_code
      set uses = uses + 1
      where code = v_code and uses < max_uses and (expires_at is null or expires_at > now());
    if not found then
      raise exception 'code_invitation_invalide' using errcode = 'P0001';
    end if;
  end if;
  insert into public.family default values returning id into new_family_id;
  insert into public.parent (user_id, family_id) values (new.id, new_family_id);
  insert into public.subscription (family_id, current_period_end)
    values (new_family_id, now() + interval '14 days');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Avis des testeurs (« Donner mon avis ») : lus par l'éditeur, supprimés avec le compte.
-- ---------------------------------------------------------------------------

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Écran d'où l'avis a été donné (chemin de l'application, sans identifiant).
  screen text check (char_length(screen) <= 100),
  mood text check (mood in ('content', 'bof', 'bloque')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index feedback_family_id_idx on public.feedback (family_id);
create index feedback_created_at_idx on public.feedback (created_at);

alter table public.feedback enable row level security;
create policy "Parent donne son avis" on public.feedback
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and user_id = (select auth.uid()));
create policy "Parent relit ses avis" on public.feedback
  for select to authenticated using (family_id = (select public.current_family_id()));
revoke all on public.feedback from anon;
revoke update, truncate, trigger, references on public.feedback from authenticated;

-- ---------------------------------------------------------------------------
-- Erreurs de l'application (plantages d'écran, erreurs inattendues) : hébergées dans l'UE comme le reste,
-- sans outil tiers. Conservées 90 jours (purge-inactive). Message et pile d'appels seulement.
-- ---------------------------------------------------------------------------

create table public.app_error (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000),
  screen text check (char_length(screen) <= 100),
  platform text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now()
);

create index app_error_created_at_idx on public.app_error (created_at);
create index app_error_user_created_idx on public.app_error (user_id, created_at);

alter table public.app_error enable row level security;
revoke all on public.app_error from anon, authenticated;

/** Enregistre une erreur (parents et appareils des enfants), 50 par compte et par jour au plus. */
create function public.log_app_error(
  p_message text,
  p_stack text default null,
  p_screen text default null,
  p_platform text default null,
  p_app_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if (
    select count(*) from public.app_error
    where user_id = auth.uid() and created_at > now() - interval '1 day'
  ) >= 50 then
    return;
  end if;
  insert into public.app_error (user_id, message, stack, screen, platform, app_version)
  values (
    auth.uid(),
    left(coalesce(nullif(btrim(p_message), ''), 'Erreur sans message'), 1000),
    left(p_stack, 4000),
    left(p_screen, 100),
    left(p_platform, 20),
    left(p_app_version, 20)
  );
end;
$$;

revoke all on function public.log_app_error(text, text, text, text, text) from public, anon;
grant execute on function public.log_app_error(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mesures d'usage de la bêta (script scripts/beta/stats.mjs, clé de service) : des comptes, sans contenu.
-- ---------------------------------------------------------------------------

create function public.beta_metrics(p_since timestamptz default now() - interval '30 days')
returns table (
  family_id uuid,
  joined_at timestamptz,
  last_active_at timestamptz,
  children integer,
  photos integer,
  validated_tasks integer,
  missions_done integer,
  active_days integer,
  feedbacks integer,
  ai_cost_usd numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    f.created_at,
    f.last_active_at,
    (select count(*)::integer from public.child_profile c where c.family_id = f.id),
    (select count(*)::integer from public.scan s where s.family_id = f.id and s.created_at >= p_since),
    (select count(*)::integer from public.task t
      where t.family_id = f.id and t.status in ('validated', 'done') and t.created_at >= p_since),
    (select count(*)::integer from public.study_session ss
      where ss.family_id = f.id and ss.status = 'done' and ss.scheduled_on >= p_since::date),
    (select count(distinct (e.created_at at time zone 'Europe/Brussels')::date)::integer
      from public.learning_event e where e.family_id = f.id and e.created_at >= p_since),
    (select count(*)::integer from public.feedback b where b.family_id = f.id and b.created_at >= p_since),
    (select coalesce(sum(u.cost_usd), 0) from public.ai_usage u where u.family_id = f.id and u.created_at >= p_since)
  from public.family f
  order by f.created_at
$$;

revoke all on function public.beta_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.beta_metrics(timestamptz) to service_role;
