-- Bilan de la semaine par e-mail, sur demande de chaque parent (désactivé par défaut).
alter table public.parent
  add column weekly_email boolean not null default false,
  add column weekly_email_sent_at timestamptz;

-- Le parent ne modifie que son choix (ni sa famille, ni la date d'envoi, écrite par le serveur).
revoke insert, update, delete on public.parent from authenticated;
grant update (weekly_email) on public.parent to authenticated;

create policy "Parent choisit le bilan par e-mail" on public.parent
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Destinataires du bilan (fonction weekly-recap) : parents abonnés, pas déjà servis cette semaine.
create function public.weekly_recap_targets(p_limit integer default 500)
returns table (user_id uuid, family_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.family_id, u.email::text
  from public.parent p
  join auth.users u on u.id = p.user_id
  where p.weekly_email
    and (p.weekly_email_sent_at is null or p.weekly_email_sent_at < now() - interval '6 days')
    and u.email is not null
  order by p.user_id
  limit p_limit
$$;

revoke execute on function public.weekly_recap_targets(integer) from anon, authenticated, public;
grant execute on function public.weekly_recap_targets(integer) to service_role;
