-- Mots d'une dictée préparée relevés sur la photo (proposés au parent sur l'écran de vérification).
-- Écrits uniquement par la fonction serveur (le parent ne peut modifier que le statut de la numérisation).
alter table public.scan add column spelling_words text[]
  check (spelling_words is null or cardinality(spelling_words) between 1 and 40);
