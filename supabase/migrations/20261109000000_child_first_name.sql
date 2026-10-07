-- Le profil enfant enregistre désormais le prénom de l'enfant (colonne « alias », nom conservé pour ne
-- rien casser). Jamais de nom de famille ; le prénom n'est pas envoyé à l'IA et il est masqué
-- automatiquement sur les photos avant leur envoi.
comment on column public.child_profile.alias is
  'Prénom de l''enfant (sans nom de famille). Jamais envoyé à l''IA ; masqué sur les photos avant envoi.';
