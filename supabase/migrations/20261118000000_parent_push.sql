-- Notifications au parent sur son téléphone : demande d'aide de l'enfant, mission du jour terminée.
-- Les événements passent par une file d'attente (parent_notification), remplie par la base elle-même : ils
-- partent aussi quand l'action de l'enfant arrive plus tard (tablette hors connexion). La fonction
-- notify-parents les envoie au service de notifications d'Expo, puis Apple ou Google les remettent.

-- Téléphones des parents qui veulent être prévenus (jeton de notification Expo, par appareil).
create table public.push_token (
  token text primary key check (char_length(token) between 10 and 200),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.family (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  notify_help boolean not null default true,
  notify_mission boolean not null default true,
  updated_at timestamptz not null default now()
);

create index push_token_family_id_idx on public.push_token (family_id);
create index push_token_user_id_idx on public.push_token (user_id);

alter table public.push_token enable row level security;
create policy "Parent voit ses appareils" on public.push_token
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate, trigger, references on public.push_token from authenticated;
revoke all on public.push_token from anon;

/** Enregistre (ou reprend) le jeton de ce téléphone pour le parent connecté, avec ses choix. */
create function public.register_push_token(
  p_token text,
  p_platform text,
  p_notify_help boolean,
  p_notify_mission boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := public.current_family_id();
begin
  if v_family is null then
    raise exception 'Réservé aux parents.';
  end if;
  -- Un téléphone passé à un autre compte ne prévient plus l'ancien.
  delete from public.push_token where token = p_token;
  if p_notify_help or p_notify_mission then
    insert into public.push_token (token, user_id, family_id, platform, notify_help, notify_mission)
    values (p_token, auth.uid(), v_family, p_platform, p_notify_help, p_notify_mission);
  end if;
end;
$$;

/** À la déconnexion : ce téléphone ne reçoit plus rien. */
create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_token where token = p_token and user_id = auth.uid()
$$;

revoke all on function public.register_push_token(text, text, boolean, boolean) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text, boolean, boolean) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- File d'attente (lue et vidée par le serveur seulement).
create table public.parent_notification (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.family (id) on delete cascade,
  child_id uuid not null,
  kind text not null check (kind in ('aide', 'mission')),
  -- Compte d'où vient l'action : un parent qui a prêté son propre téléphone n'y est pas prévenu.
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index parent_notification_unsent_idx on public.parent_notification (created_at) where sent_at is null;
create index parent_notification_family_id_idx on public.parent_notification (family_id);

alter table public.parent_notification enable row level security;
revoke all on public.parent_notification from anon, authenticated;

-- notify-parents rejoint les fonctions que la base peut appeler (même secret que les tâches programmées).
create or replace function public.call_scheduled_function(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_name not in ('purge-photos', 'purge-inactive', 'weekly-recap', 'notify-parents') then
    raise exception 'Fonction non programmable : %', p_name;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'purge_secret';
  if v_url is null or v_secret is null then
    raise notice 'Tâche % ignorée : secrets project_url et purge_secret absents du coffre.', p_name;
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.call_scheduled_function(text) from public, anon, authenticated;

/** Ajoute un événement à la file et demande l'envoi tout de suite (après validation de la transaction). */
create function public.queue_parent_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'help_request' then
    insert into public.parent_notification (family_id, child_id, kind, actor_user_id)
    values (new.family_id, new.child_id, 'aide', auth.uid());
  elsif new.status = 'done' and old.status is distinct from 'done' then
    insert into public.parent_notification (family_id, child_id, kind, actor_user_id)
    values (new.family_id, new.child_id, 'mission', auth.uid());
  else
    return new;
  end if;
  perform public.call_scheduled_function('notify-parents');
  return new;
end;
$$;

create trigger help_request_notify_parents
  after insert on public.help_request
  for each row execute function public.queue_parent_notification();

create trigger study_session_notify_parents
  after update of status on public.study_session
  for each row execute function public.queue_parent_notification();

-- Rattrapage (envoi immédiat raté, secrets ajoutés plus tard) : toutes les 5 minutes, seulement s'il reste
-- quelque chose à envoyer.
select cron.schedule(
  'notify-parents',
  '*/5 * * * *',
  $$select public.call_scheduled_function('notify-parents')
    where exists (select 1 from public.parent_notification where sent_at is null)$$
);
