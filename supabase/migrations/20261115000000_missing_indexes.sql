-- Index des clés étrangères ajoutées récemment (suppression d'une tâche ou d'un compte sans parcours complet).
create index scan_vocabulary_task_id_idx on public.scan (vocabulary_task_id) where vocabulary_task_id is not null;
create index feedback_user_id_idx on public.feedback (user_id);
