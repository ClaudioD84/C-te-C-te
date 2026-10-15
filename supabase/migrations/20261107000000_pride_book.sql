-- Carnet de fierté : un moment dont l'enfant est fier (pictogramme et quelques mots), noté depuis sa
-- console ou sa tablette, lu (et imprimé) par le parent.
create table public.pride_entry (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default coalesce(public.current_family_id(), public.current_device_family_id())
    references public.family (id) on delete cascade,
  child_id uuid not null,
  emoji text not null check (emoji in ('⭐', '🏆', '💪', '🤝', '🎨', '📚', '⚽', '🎵', '🌱', '😊')),
  text text check (text is null or char_length(btrim(text)) between 1 and 140),
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index pride_entry_child_idx on public.pride_entry (child_id, created_at);
create index pride_entry_family_id_idx on public.pride_entry (family_id);

alter table public.pride_entry enable row level security;
revoke all on public.pride_entry from anon;
revoke update, truncate, trigger, references on public.pride_entry from authenticated;

create policy "Parent gère le carnet de fierté" on public.pride_entry
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Appareil lit le carnet de fierté" on public.pride_entry
  for select to authenticated using (child_id = (select public.current_device_child_id()));
create policy "Appareil ajoute au carnet de fierté" on public.pride_entry
  for insert to authenticated
  with check (
    child_id = (select public.current_device_child_id())
    and family_id = (select public.current_device_family_id())
  );

-- Au plus 5 moments par jour et par enfant.
create function public.pride_entry_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.pride_entry
      where child_id = new.child_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Cinq moments par jour au plus.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pride_entry_limit
  before insert on public.pride_entry
  for each row execute function public.pride_entry_limit();

revoke execute on function public.pride_entry_limit() from anon, authenticated, public;
