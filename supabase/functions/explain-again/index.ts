import {
  checkAccess,
  EXPLAIN_ACCESS_MESSAGES,
  MONTHLY_EXPLAIN_QUOTA,
  startOfMonthBrussels,
  type Subscription,
} from '../_shared/access.ts';
import { PACK_MODEL, structuredCall } from '../_shared/claude.ts';
import { z } from '../_shared/deps.ts';
import {
  buildExplainRequest,
  EXPLAIN_JSON_SCHEMA,
  EXPLAIN_SYSTEM_PROMPT,
  parseExplanation,
} from '../_shared/explain.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { interestLabels, studyPackSchema } from '../_shared/pack.ts';
import { estimateCostUsd } from '../_shared/pricing.ts';
import { adminClient, authenticateMember } from '../_shared/supabase.ts';

const bodySchema = z.object({ packId: z.uuid(), section: z.number().int().min(0).max(50) });

/**
 * « Explique-le moi autrement » : réexplique une partie d'une fiche, plus simplement. Appelée par le parent
 * ou la tablette de l'enfant (pour ses fiches). Une explication par partie, gardée : elle n'est payée qu'une fois.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    const { familyId, deviceChildId } = await authenticateMember(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    const { packId, section } = body.data;

    const { data: pack } = await admin
      .from('study_pack')
      .select('id, child_id, content, task(subject)')
      .eq('id', packId)
      .eq('family_id', familyId)
      .maybeSingle();
    if (!pack || (deviceChildId !== null && pack.child_id !== deviceChildId))
      throw new UserFacingError('Fiche introuvable.', 404);
    const fiche = studyPackSchema.parse(pack.content).fiche;
    const part = fiche?.sections[section];
    if (!fiche || !part) throw new UserFacingError('Partie introuvable.', 404);

    const { data: cached } = await admin
      .from('explanation')
      .select('content')
      .eq('pack_id', packId)
      .eq('section_index', section)
      .maybeSingle();
    if (cached) return json({ explanation: cached.content });

    const now = new Date();
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
        .eq('function_name', 'explain-again')
        .gte('created_at', startOfMonthBrussels(now)),
    ]);
    const problem = checkAccess(subscription as Subscription | null, count ?? 0, MONTHLY_EXPLAIN_QUOTA, now);
    if (problem) throw new UserFacingError(EXPLAIN_ACCESS_MESSAGES[problem], 402);

    const { data: child } = await admin
      .from('child_profile')
      .select('grade, needs, preferences')
      .eq('id', pack.child_id)
      .single();
    if (!child) throw new Error('Profil introuvable');

    const result = await structuredCall({
      model: PACK_MODEL,
      effort: 'low',
      system: EXPLAIN_SYSTEM_PROMPT,
      schema: EXPLAIN_JSON_SCHEMA,
      maxTokens: 4000,
      content: [
        {
          type: 'text',
          text: buildExplainRequest({
            grade: child.grade,
            needs: child.needs ?? [],
            interests: interestLabels(child.preferences?.interests),
            subject: (pack.task as unknown as { subject: string } | null)?.subject ?? '',
            ficheTitle: fiche.title,
            heading: part.heading,
            points: part.points,
          }),
        },
      ],
    });
    const explanation = parseExplanation(result.text);

    // Demande simultanée : la première explication enregistrée est gardée.
    await admin
      .from('explanation')
      .upsert(
        {
          pack_id: packId,
          section_index: section,
          family_id: familyId,
          child_id: pack.child_id,
          content: explanation,
        },
        { onConflict: 'pack_id,section_index', ignoreDuplicates: true },
      );
    await admin.from('ai_usage').insert({
      family_id: familyId,
      function_name: 'explain-again',
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cache_read_tokens: result.usage.cache_read_input_tokens ?? 0,
      cost_usd: estimateCostUsd(result.model, result.usage),
    });
    return json({ explanation });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('explain-again', error);
    return json({ error: 'L’explication n’a pas pu être préparée. Réessaie dans un instant.' }, 500);
  }
});
