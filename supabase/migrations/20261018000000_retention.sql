-- Limitation de la conservation (RGPD) : comptes inactifs depuis 24 mois supprimés après un avertissement
-- par e-mail (30 jours), journal de l'effort effacé après 2 ans. Exécuté par la fonction purge-inactive.

alter table public.family
  add column last_active_at timestamptz not null default now(),
  add column inactivity_warned_at timestamptz;

-- L'application signale l'activité de la famille à l'ouverture (au plus une écriture par heure).
-- Une reconnexion annule l'avertissement de suppression.
create function public.touch_family_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.family
  set last_active_at = now(), inactivity_warned_at = null
  where id = public.current_family_id()
    and (last_active_at < now() - interval '1 hour' or inactivity_warned_at is not null);
$$;

revoke execute on function public.touch_family_activity() from anon, public;
grant execute on function public.touch_family_activity() to authenticated;

-- Familles inactives depuis 24 mois, avec l'e-mail de leurs parents et la fin de l'abonnement payé.
create function public.inactive_families(p_limit integer default 200)
returns table (
  family_id uuid,
  last_active_at timestamptz,
  inactivity_warned_at timestamptz,
  paid_until timestamptz,
  emails text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    f.last_active_at,
    f.inactivity_warned_at,
    case when s.plan <> 'essai' and coalesce(s.store, '') <> 'simulation' then s.current_period_end end,
    coalesce(array_agg(u.email::text) filter (where u.email is not null), '{}')
  from public.family f
  left join public.subscription s on s.family_id = f.id
  left join public.parent p on p.family_id = f.id
  left join auth.users u on u.id = p.user_id
  where f.last_active_at < now() - interval '24 months'
  group by f.id, s.plan, s.store, s.current_period_end
  order by f.last_active_at
  limit p_limit;
$$;

revoke execute on function public.inactive_families(integer) from anon, authenticated, public;
grant execute on function public.inactive_families(integer) to service_role;

-- Journal de l'effort : effacé après 2 ans (les récompenses ne lisent que la dernière année).
create function public.purge_old_learning_events()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.learning_event where created_at < now() - interval '2 years' returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke execute on function public.purge_old_learning_events() from anon, authenticated, public;
grant execute on function public.purge_old_learning_events() to service_role;
