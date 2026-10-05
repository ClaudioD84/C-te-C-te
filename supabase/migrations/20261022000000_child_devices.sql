-- Appareil de l'enfant (cahier des charges, section 4) : une tablette reliée à un profil enfant par un code
-- ou un QR code, qui n'affiche que la console de cet enfant.
--
-- La tablette reçoit un compte à elle (créé par la fonction pair-device, adresse en
-- @appareils.coteacote.invalid, marqué dans app_metadata, modifiable uniquement côté serveur). Ce compte n'est pas un parent : current_family_id() est nul pour lui
-- et aucune règle « parent » ne s'applique. Les règles ci-dessous lui ouvrent seulement ce dont la console
-- enfant a besoin, pour son enfant.

-- ---------------------------------------------------------------------------
-- Un compte d'appareil ne crée pas de famille
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
begin
  -- Compte d'appareil (créé par pair-device) : reconnu à son domaine réservé, car app_metadata n'est
  -- pas encore renseigné à l'insertion. Une inscription publique avec ce domaine n'obtient aucun droit.
  if new.email like '%@appareils.coteacote.invalid' then
    return new;
  end if;
  insert into public.family default values returning id into new_family_id;
  insert into public.parent (user_id, family_id) values (new.id, new_family_id);
  insert into public.subscription (family_id, current_period_end)
    values (new_family_id, now() + interval '14 days');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Appareils reliés et codes de liaison
-- ---------------------------------------------------------------------------

create table public.child_device (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.family (id) on delete cascade,
  child_id uuid not null,
  name text not null default 'Tablette' check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index child_device_child_id_idx on public.child_device (child_id);
create index child_device_family_id_idx on public.child_device (family_id);

-- Code à usage unique, valable 15 minutes ; seule son empreinte est gardée.
create table public.device_pairing (
  code_hash text primary key,
  family_id uuid not null references public.family (id) on delete cascade,
  child_id uuid not null,
  expires_at timestamptz not null default now() + interval '15 minutes',
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index device_pairing_family_id_idx on public.device_pairing (family_id);

-- Codes erronés, par empreinte d'adresse IP : au-delà de 10 en 15 minutes, la liaison est refusée.
create table public.device_pairing_failure (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index device_pairing_failure_ip_idx on public.device_pairing_failure (ip_hash, created_at);
alter table public.device_pairing_failure enable row level security;
revoke all on public.device_pairing_failure from anon, authenticated;

alter table public.child_device enable row level security;
alter table public.device_pairing enable row level security;

-- Codes : uniquement par les fonctions ci-dessous et la fonction serveur pair-device.
revoke all on public.device_pairing from anon, authenticated;
revoke all on public.child_device from anon;
revoke insert, update, truncate, trigger, references on public.child_device from authenticated;

create policy "Parent voit et retire les appareils" on public.child_device
  for select to authenticated using (family_id = (select public.current_family_id()));
create policy "Parent retire un appareil" on public.child_device
  for delete to authenticated using (family_id = (select public.current_family_id()));
create policy "Appareil se voit et se délie" on public.child_device
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Appareil se délie" on public.child_device
  for delete to authenticated using (user_id = (select auth.uid()));

-- Appareil retiré (par le parent, par lui-même ou avec le profil) : son compte est supprimé.
create function public.delete_device_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = old.user_id;
  return old;
end;
$$;

create trigger child_device_delete_user
  after delete on public.child_device
  for each row execute function public.delete_device_user();

revoke execute on function public.delete_device_user() from anon, authenticated, public;

-- Enfant et famille de l'appareil connecté (nuls pour un parent).
create function public.current_device_child_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select child_id from public.child_device where user_id = auth.uid()
$$;

create function public.current_device_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.child_device where user_id = auth.uid()
$$;

revoke execute on function public.current_device_child_id() from anon, public;
revoke execute on function public.current_device_family_id() from anon, public;
grant execute on function public.current_device_child_id() to authenticated;
grant execute on function public.current_device_family_id() to authenticated;

-- Le parent demande un code pour un de ses enfants (au plus 5 codes en cours par famille).
create function public.create_device_pairing(p_child_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid := public.current_family_id();
  -- Sans 0/O, 1/I/L : le code se recopie sans ambiguïté.
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_code text := '';
begin
  if v_family_id is null then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  if not exists (select 1 from public.child_profile where id = p_child_id and family_id = v_family_id) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;

  delete from public.device_pairing where family_id = v_family_id and expires_at < now();
  if (select count(*) from public.device_pairing where family_id = v_family_id) >= 5 then
    raise exception 'Trop de codes en cours. Réessayez dans quelques minutes.' using errcode = 'P0001';
  end if;

  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;
  insert into public.device_pairing (code_hash, family_id, child_id)
    values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_family_id, p_child_id);
  return v_code;
end;
$$;

revoke execute on function public.create_device_pairing(uuid) from anon, public;
grant execute on function public.create_device_pairing(uuid) to authenticated;

-- La tablette utilisée compte comme une activité de la famille (conservation : 24 mois d'inactivité)
-- et le parent voit quand elle a servi pour la dernière fois.
create or replace function public.touch_family_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.child_device set last_seen_at = now()
  where user_id = auth.uid() and last_seen_at < now() - interval '1 hour';
  update public.family
  set last_active_at = now(), inactivity_warned_at = null
  where id = coalesce(public.current_family_id(), public.current_device_family_id())
    and (last_active_at < now() - interval '1 hour' or inactivity_warned_at is not null);
$$;

-- ---------------------------------------------------------------------------
-- Ce que l'appareil peut lire et faire : la console de son enfant
-- ---------------------------------------------------------------------------

create policy "Appareil lit son enfant" on public.child_profile
  for select to authenticated using (id = (select public.current_device_child_id()));

create policy "Appareil lit les tâches" on public.task
  for select to authenticated using (child_id = (select public.current_device_child_id()));

create policy "Appareil lit les sessions" on public.study_session
  for select to authenticated using (child_id = (select public.current_device_child_id()));
create policy "Appareil termine une session" on public.study_session
  for update to authenticated
  using (child_id = (select public.current_device_child_id()))
  with check (child_id = (select public.current_device_child_id()));

create policy "Appareil lit le contenu des sessions" on public.study_session_task
  for select to authenticated
  using (exists (
    select 1 from public.study_session s
    where s.id = session_id and s.child_id = (select public.current_device_child_id())
  ));
create policy "Appareil coche une activité" on public.study_session_task
  for update to authenticated
  using (exists (
    select 1 from public.study_session s
    where s.id = session_id and s.child_id = (select public.current_device_child_id())
  ))
  with check (exists (
    select 1 from public.study_session s
    where s.id = session_id and s.child_id = (select public.current_device_child_id())
  ));

create policy "Appareil lit les paquets" on public.study_pack
  for select to authenticated using (child_id = (select public.current_device_child_id()));

create policy "Appareil lit les cartes" on public.flashcard
  for select to authenticated using (child_id = (select public.current_device_child_id()));
create policy "Appareil révise les cartes" on public.flashcard
  for update to authenticated
  using (child_id = (select public.current_device_child_id()))
  with check (child_id = (select public.current_device_child_id()));

create policy "Appareil lit les événements" on public.learning_event
  for select to authenticated using (child_id = (select public.current_device_child_id()));
create policy "Appareil ajoute des événements" on public.learning_event
  for insert to authenticated
  with check (
    child_id = (select public.current_device_child_id())
    and family_id = (select public.current_device_family_id())
  );

create policy "Appareil lit les activités de maternelle" on public.kindergarten_week
  for select to authenticated using (child_id = (select public.current_device_child_id()));

create policy "Appareil lit les épreuves" on public.exam
  for select to authenticated using (child_id = (select public.current_device_child_id()));

-- Les événements de l'appareil sont rattachés à sa famille sans que l'application l'indique.
alter table public.learning_event
  alter column family_id set default coalesce(public.current_family_id(), public.current_device_family_id());

-- L'appareil ne modifie que l'état d'avancement : pas la durée, la date ni le contenu des sessions.
create function public.device_update_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select public.current_device_child_id()) is not null
    and (to_jsonb(new) - tg_argv) is distinct from (to_jsonb(old) - tg_argv) then
    raise exception 'Modification non autorisée depuis l''appareil de l''enfant' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger study_session_device_guard
  before update on public.study_session
  for each row execute function public.device_update_guard('status');
create trigger study_session_task_device_guard
  before update on public.study_session_task
  for each row execute function public.device_update_guard('done_at');

revoke execute on function public.device_update_guard() from anon, authenticated, public;
