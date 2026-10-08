-- Contenus culturels : types tirés des repères du référentiel d'éducation culturelle et artistique.
alter table public.cultural_resource drop constraint cultural_resource_kind_check;
alter table public.cultural_resource add constraint cultural_resource_kind_check
  check (kind in ('documentaire', 'musee', 'sortie', 'livre', 'jeu', 'site', 'musique', 'oeuvre', 'spectacle', 'patrimoine'));
