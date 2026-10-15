-- Tâches programmées dans la base (pg_cron) : plus rien à configurer à la main dans le tableau de bord.
-- Elles appellent les fonctions serveur avec l'adresse du projet et le secret PURGE_SECRET, gardés dans le coffre
-- de Supabase (Vault). Tant que ces deux secrets manquent (développement, CI), les tâches ne font rien.
--
-- En production, une seule fois (éditeur SQL) :
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<même valeur que PURGE_SECRET>', 'purge_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.call_scheduled_function(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_name not in ('purge-photos', 'purge-inactive', 'weekly-recap') then
    raise exception 'Fonction non programmable : %', p_name;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'purge_secret';
  if v_url is null or v_secret is null then
    raise notice 'Tâche % ignorée : secrets project_url et purge_secret absents du coffre.', p_name;
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.call_scheduled_function(text) from public, anon, authenticated;

-- Horaires en UTC. Photos : toutes les heures, pour tenir la promesse « supprimées au plus tard après 24 heures »
-- (une fois par jour, une photo pouvait rester près de 48 heures).
select cron.schedule('purge-photos', '7 * * * *', $$select public.call_scheduled_function('purge-photos')$$);
-- Conservation des données : chaque nuit (vers 4 h 30 à Bruxelles).
select cron.schedule('purge-inactive', '30 2 * * *', $$select public.call_scheduled_function('purge-inactive')$$);
-- Bilan de la semaine par e-mail : le dimanche à 17 h UTC (19 h en été, 18 h en hiver à Bruxelles).
select cron.schedule('weekly-recap', '0 17 * * 0', $$select public.call_scheduled_function('weekly-recap')$$);
