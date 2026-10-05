-- Abonnement (F13) : état tenu à jour par RevenueCat (App Store, Google Play) via la fonction
-- revenuecat-webhook. L'identifiant de l'acheteur dans RevenueCat est l'identifiant de la famille.
alter table public.subscription
  add column store text check (store in ('app_store', 'play_store', 'promotional', 'simulation')),
  add column product_id text,
  -- Renouvellement prévu (faux après une résiliation : l'accès reste ouvert jusqu'à la fin de la période).
  add column will_renew boolean not null default false,
  -- Paiement refusé : le store retente pendant le délai de grâce, l'accès reste ouvert.
  add column billing_issue boolean not null default false,
  -- Heure du dernier événement appliqué : un événement plus ancien, reçu en retard, est ignoré.
  add column last_event_at timestamptz;

-- Historique des événements reçus : un événement renvoyé par RevenueCat n'est traité qu'une fois.
create table public.subscription_event (
  id text primary key,
  family_id uuid references public.family (id) on delete cascade,
  type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

create index subscription_event_family_id_idx on public.subscription_event (family_id);

-- Réservée à la fonction serveur (clé « service ») : aucune politique pour les utilisateurs.
alter table public.subscription_event enable row level security;
revoke all on public.subscription_event from anon, authenticated;

-- Nombre d'enfants selon la formule : Solo 1, Famille et essai 4.
create function public.child_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'solo' then 1 else 4 end;
$$;

create function public.check_child_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_count integer;
begin
  select plan into v_plan from public.subscription where family_id = new.family_id;
  select count(*) into v_count from public.child_profile where family_id = new.family_id;
  if v_count >= public.child_limit(coalesce(v_plan, 'essai')) then
    raise exception 'limite_enfants' using
      errcode = 'P0001',
      hint = 'La formule de la famille ne permet pas d''ajouter un enfant.';
  end if;
  return new;
end;
$$;

create trigger child_profile_limit
  before insert on public.child_profile
  for each row execute function public.check_child_limit();
