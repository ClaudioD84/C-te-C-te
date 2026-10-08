-- Accessoire de l'avatar, choisi par l'enfant (sur le téléphone du parent ou sa tablette).
alter table public.child_profile add column accessory text
  check (accessory in ('casquette', 'lunettes', 'echarpe', 'chapeau', 'cape', 'medaille', 'fusee', 'arcenciel',
                       'couronne', 'etoile'));

-- La tablette ne peut pas modifier le profil : cette fonction ne touche que l'accessoire, de son enfant.
create function public.set_avatar_accessory(p_child_id uuid, p_accessory text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.child_profile c
    where c.id = p_child_id
      and (c.family_id = public.current_family_id() or c.id = public.current_device_child_id())
  ) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  update public.child_profile set accessory = p_accessory where id = p_child_id;
end;
$$;

revoke execute on function public.set_avatar_accessory(uuid, text) from anon, public;
grant execute on function public.set_avatar_accessory(uuid, text) to authenticated;
