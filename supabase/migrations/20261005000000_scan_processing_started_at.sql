-- Permet de relancer une analyse restée bloquée (fonction interrompue, réseau coupé…).
alter table public.scan add column processing_started_at timestamptz;
