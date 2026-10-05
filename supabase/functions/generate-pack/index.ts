import {
  checkAccess,
  MONTHLY_PACK_QUOTA,
  PACK_ACCESS_MESSAGES,
  startOfMonthBrussels,
  type Subscription,
} from '../_shared/access.ts';
import { PACK_EFFORT, PACK_MODEL, structuredCall } from '../_shared/claude.ts';
import { z } from '../_shared/deps.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import {
  buildPackRequest,
  curriculumSubjects,
  PACK_JSON_SCHEMA,
  PACK_SYSTEM_PROMPT,
  parsePack,
} from '../_shared/pack.ts';
import { estimateCostUsd } from '../_shared/pricing.ts';
import { adminClient, authenticate } from '../_shared/supabase.ts';

/**
 * Prépare le paquet d'étude d'une tâche (fiche, quiz, exercices, cartes) avec Claude.
 * Idempotent : si le paquet existe, il est renvoyé tel quel, sauf demande de régénération.
 */

const bodySchema = z.object({ taskId: z.uuid(), regenerate: z.boolean().optional() });
const PACK_COLUMNS = 'id, task_id, content, created_at, reported_at';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    const { familyId } = await authenticate(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    const { taskId, regenerate } = body.data;

    const { data: task } = await admin
      .from('task')
      .select('id, child_id, subject, kind, description, reference, status')
      .eq('id', taskId)
      .eq('family_id', familyId)
      .maybeSingle();
    if (!task) throw new UserFacingError('Tâche introuvable.', 404);
    if (task.status === 'draft') throw new UserFacingError("Validez d'abord la liste des tâches.", 409);

    const { data: existing } = await admin
      .from('study_pack')
      .select(PACK_COLUMNS)
      .eq('task_id', taskId)
      .maybeSingle();
    if (existing && !regenerate) return json({ pack: existing });

    const now = new Date();
    const [{ data: subscription }, { count }] = await Promise.all([
      admin
        .from('subscription')
        .select('plan, status, current_period_end')
        .eq('family_id', familyId)
        .maybeSingle(),
      admin
        .from('study_pack')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .gte('created_at', startOfMonthBrussels(now)),
    ]);
    const problem = checkAccess(subscription as Subscription | null, count ?? 0, MONTHLY_PACK_QUOTA, now);
    if (problem) throw new UserFacingError(PACK_ACCESS_MESSAGES[problem], 402);

    const { data: child } = await admin
      .from('child_profile')
      .select('grade, track, needs')
      .eq('id', task.child_id)
      .single();
    if (!child) throw new Error('Profil introuvable');

    const { data: curriculum } = await admin
      .from('curriculum_item')
      .select('label')
      .contains('grades', [child.grade])
      .contains('tracks', [child.track])
      .in('subject', curriculumSubjects(task.subject))
      .eq('kind', 'attendu')
      .limit(60);

    const result = await structuredCall({
      model: PACK_MODEL,
      effort: PACK_EFFORT,
      system: PACK_SYSTEM_PROMPT,
      schema: PACK_JSON_SCHEMA,
      maxTokens: 32000,
      content: [
        {
          type: 'text',
          text: buildPackRequest({
            grade: child.grade,
            track: child.track,
            needs: child.needs ?? [],
            task,
            curriculum: (curriculum ?? []).map((c) => c.label as string),
          }),
        },
      ],
    });
    const content = parsePack(result.text);

    // Régénération : l'ancien paquet et ses cartes sont remplacés.
    if (existing) await admin.from('study_pack').delete().eq('id', existing.id);
    const { data: pack, error } = await admin
      .from('study_pack')
      .insert({
        family_id: familyId,
        child_id: task.child_id,
        task_id: task.id,
        content,
        model: result.model,
      })
      .select(PACK_COLUMNS)
      .single();
    if (error) {
      // Génération simultanée : on renvoie le paquet déjà enregistré.
      const { data: concurrent } = await admin
        .from('study_pack')
        .select(PACK_COLUMNS)
        .eq('task_id', taskId)
        .maybeSingle();
      if (concurrent) return json({ pack: concurrent });
      throw error;
    }

    if (content.flashcards.length > 0) {
      const { error: cardsError } = await admin.from('flashcard').insert(
        content.flashcards.map((card) => ({
          family_id: familyId,
          child_id: task.child_id,
          pack_id: pack.id,
          front: card.front,
          back: card.back,
        })),
      );
      if (cardsError) throw cardsError;
    }

    await admin.from('ai_usage').insert({
      family_id: familyId,
      function_name: 'generate-pack',
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cache_read_tokens: result.usage.cache_read_input_tokens ?? 0,
      cost_usd: estimateCostUsd(result.model, result.usage),
    });

    return json({ pack });
  } catch (error) {
    if (error instanceof UserFacingError) return json({ error: error.message }, error.status);
    console.error('generate-pack', error);
    return json({ error: 'La préparation a échoué. Réessayez dans un instant.' }, 500);
  }
});
