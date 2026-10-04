-- Les référentiels sont importés par script : un code est unique pour une version donnée.
alter table public.curriculum_item alter column code set not null;
alter table public.curriculum_item add constraint curriculum_item_version_code_unique unique (version, code);
