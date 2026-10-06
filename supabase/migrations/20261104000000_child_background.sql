-- Fond d'écran de la console, choisi par l'enfant (aussi depuis sa tablette).
alter table public.child_profile add column background text
  check (background in ('uni', 'etoiles', 'galaxie', 'ocean', 'grand_bleu', 'foret', 'dinos', 'foot', 'musique', 'atelier', 'patisserie', 'pixels', 'prairie', 'voyage', 'bibliotheque', 'minimal', 'arc_en_ciel', 'aurore'));

create function public.set_child_background(p_child_id uuid, p_background text)
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
  update public.child_profile set background = p_background where id = p_child_id;
end;
$$;

revoke execute on function public.set_child_background(uuid, text) from anon, public;
grant execute on function public.set_child_background(uuid, text) to authenticated;
