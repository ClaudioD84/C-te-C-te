import {
  checkAccess,
  MONTHLY_REVISION_QUOTA,
  REVISION_ACCESS_MESSAGES,
  startOfMonthBrussels,
  type Subscription,
} from '../_shared/access.ts';
import { PACK_EFFORT, PACK_MODEL, structuredCall } from '../_shared/claude.ts';
import { z } from '../_shared/deps.ts';
import { todayInBrussels } from '../_shared/extraction.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { estimateCostUsd } from '../_shared/pricing.ts';
import {
  buildRevisionRequest,
  EXAM_TYPES,
  parseThemes,
  REVISION_SYSTEM_PROMPT,
  THEMES_JSON_SCHEMA,
} from '../_shared/revision.ts';
import { curriculumSubjects } from '../_shared/pack.ts';
import { adminClient, authenticate } from '../_shared/supabase.ts';

/**
 * Propose les thèmes de révision d'une épreuve. Rien n'est enregistré ici :
 * le parent relit la proposition, puis l'application crée l'épreuve et les tâches.
 */

const bodySchema = z.object({
  childId: z.uuid(),
  examType: z.enum(EXAM_TYPES),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subjects: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
  revisionDays: z.number().int().min(1).max(200),
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    const { familyId } = await authenticate(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    const input = body.data;

    const now = new Date();
    if (input.examDate <= todayInBrussels(now).iso)
      throw new UserFacingError("La date de l'épreuve doit être dans le futur.");

    const { data: child } = await admin
      .from('child_profile')
      .select('grade')
      .eq('id', input.childId)
      .eq('family_id', familyId)
      .maybeSingle();
    if (!child) throw new UserFacingError('Profil introuvable.', 404);

    const [{ data: subscription }, { count }] = await Promise.all([
      admin
        .from('subscription')
        .select('plan, status, current_period_end')
        .eq('family_id', familyId)
        .maybeSingle(),
      admin
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('function_name', 'revision-plan')
        .gte('created_at', startOfMonthBrussels(now)),
    ]);
    const problem = checkAccess(subscription as Subscription | null, count ?? 0, MONTHLY_REVISION_QUOTA, now);
    if (problem) throw new UserFacingError(REVISION_ACCESS_MESSAGES[problem], 402);

    const { data: curriculum } = await admin
      .from('curriculum_item')
      .select('subject, label')
      .contains('grades', [child.grade])
      .in('subject', [...new Set(input.subjects.flatMap(curriculumSubjects))])
      .eq('kind', 'attendu')
      .limit(80);

    const result = await structuredCall({
      model: PACK_MODEL,
      effort: PACK_EFFORT,
      system: REVISION_SYSTEM_PROMPT,
      schema: THEMES_JSON_SCHEMA,
      content: [
        {
          type: 'text',
          text: buildRevisionRequest({
            grade: child.grade,
            examType: input.examType,
            subjects: input.subjects,
            revisionDays: input.revisionDays,
            curriculum: (curriculum ?? []) as { subject: string; label: string }[],
          }),
        },
      ],
    });
    const { themes } = parseThemes(result.text, input.subjects);

    await admin.from('ai_usage').insert({
      family_id: familyId,
      function_name: 'revision-plan',
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cache_read_tokens: result.usage.cache_read_input_tokens ?? 0,
      cost_usd: estimateCostUsd(result.model, result.usage),
    });

    return json({ themes });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('revision-plan', error);
    return json({ error: 'La préparation du dossier a échoué. Réessayez dans un instant.' }, 500);
  }
});
