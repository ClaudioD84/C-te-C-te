-- Compétences terminales du secondaire (S3/S4 → S6/S7) : elles diffèrent entre la transition
-- (général, technique de transition) et la qualification (technique, professionnel).
alter table public.curriculum_item
  add column tracks text[] not null default array['general', 'technique', 'professionnel', 'specialise']::text[];

create index curriculum_item_tracks_idx on public.curriculum_item using gin (tracks);
