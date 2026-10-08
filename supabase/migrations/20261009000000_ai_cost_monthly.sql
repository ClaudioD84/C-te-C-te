-- Suivi du coût réel de l'IA (bêta) : par famille, par mois, par fonction et par modèle.
-- Réservé au rôle service (tableau de bord Supabase, éditeur SQL).
create view public.ai_cost_monthly
with (security_invoker = true)
as
select
  family_id,
  date_trunc('month', created_at at time zone 'Europe/Brussels')::date as month,
  function_name,
  model,
  count(*) as calls,
  sum(input_tokens) as input_tokens,
  sum(output_tokens) as output_tokens,
  sum(cache_read_tokens) as cache_read_tokens,
  round(sum(cost_usd), 4) as cost_usd,
  round(avg(cost_usd), 4) as avg_cost_usd
from public.ai_usage
group by 1, 2, 3, 4;

revoke all on public.ai_cost_monthly from anon, authenticated;
