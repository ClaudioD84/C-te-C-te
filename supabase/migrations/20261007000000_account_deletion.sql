-- Suppression de compte (RGPD) : quand le dernier parent d'une famille est supprimé,
-- la famille et toutes ses données (enfants, tâches, plannings, consommation) le sont aussi.
create function public.delete_orphan_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.parent where family_id = old.family_id) then
    delete from public.family where id = old.family_id;
  end if;
  return old;
end;
$$;

revoke execute on function public.delete_orphan_family() from anon, authenticated, public;

create trigger on_parent_deleted
  after delete on public.parent
  for each row execute function public.delete_orphan_family();
