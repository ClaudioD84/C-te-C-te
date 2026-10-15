-- Cartable du soir : affaires à emporter et leurs jours, notées par le parent, cochées par l'enfant
-- (les coches restent sur l'appareil).
create table public.school_bag_item (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.current_family_id() references public.family (id) on delete cascade,
  child_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  days text[] not null
    check (cardinality(days) between 1 and 7 and days <@ array['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']),
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.child_profile (id, family_id) on delete cascade
);

create index school_bag_item_child_idx on public.school_bag_item (child_id, created_at);
create index school_bag_item_family_id_idx on public.school_bag_item (family_id);

alter table public.school_bag_item enable row level security;
revoke all on public.school_bag_item from anon;
revoke truncate, trigger, references on public.school_bag_item from authenticated;

create policy "Parent gère le cartable" on public.school_bag_item
  for all to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Appareil lit le cartable" on public.school_bag_item
  for select to authenticated using (child_id = (select public.current_device_child_id()));

-- Au plus 30 affaires par enfant.
create function public.school_bag_item_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.school_bag_item where child_id = new.child_id) >= 30 then
    raise exception 'Trente affaires au plus dans le cartable.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger school_bag_item_limit
  before insert on public.school_bag_item
  for each row execute function public.school_bag_item_limit();

revoke execute on function public.school_bag_item_limit() from anon, authenticated, public;
