-- Hors connexion (exigence 6.3) : les efforts de l'enfant sont envoyés plus tard, depuis une file d'attente.
-- client_id : identifiant créé sur l'appareil, pour qu'un envoi rejoué ne compte pas deux fois.
alter table public.learning_event add column client_id uuid unique;

-- L'appareil indique l'heure réelle de l'effort (pour les récompenses du bon jour). On la borne :
-- pas dans le futur, et pas plus de 14 jours en arrière (durée maximale raisonnable hors connexion).
create function public.learning_event_clamp_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := least(greatest(coalesce(new.created_at, now()), now() - interval '14 days'), now());
  return new;
end;
$$;

create trigger learning_event_clamp_created_at
  before insert on public.learning_event
  for each row execute function public.learning_event_clamp_created_at();
