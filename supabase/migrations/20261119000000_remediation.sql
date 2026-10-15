-- Interrogation corrigée : les erreurs relevées sur la copie (ce qui était demandé, ce que l'élève a écrit, la
-- correction de l'enseignant) restent attachées à la notion à retravailler. La fiche de remédiation s'en sert
-- pour un rappel ciblé, des exercices guidés puis des exercices en autonomie. Jamais de note, de points, de nom.

alter table public.task
  add column remediation jsonb
    check (remediation is null or (jsonb_typeof(remediation) = 'object' and jsonb_typeof(remediation -> 'errors') = 'array'));

comment on column public.task.remediation is
  'Notion à retravailler relevée sur une interrogation corrigée : { errors: [{ question, childAnswer, correction }] }, sinon null.';
