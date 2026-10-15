import {
  checkAccess,
  MONTHLY_PACK_QUOTA,
  PACK_ACCESS_MESSAGES,
  startOfMonthBrussels,
  type Subscription,
} from '../_shared/access.ts';
import { generatePackFromRequest } from '../_shared/claude.ts';
import { z, type SupabaseClient } from '../_shared/deps.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import {
  buildPackRequest,
  curriculumSubjects,
  interestLabels,
  packRequestKey,
  parsePackResponse,
  type StudyPack,
} from '../_shared/pack.ts';
import { estimateCostUsd } from '../_shared/pricing.ts';
import { adminClient, authenticateMember } from '../_shared/supabase.ts';
import { reportServerError } from '../_shared/monitoring.ts';

/**
 * Prépare le paquet d'étude d'une tâche (fiche, quiz, exercices, cartes) avec Claude, à la demande : quand l'enfant
 * en a besoin (console, 3 jours d'avance) ou que le parent le demande.
 * Idempotent : si le paquet existe, il est renvoyé tel quel, sauf demande de régénération ; une liste de vocabulaire
 * photographiée (cartes seules) est complétée la première fois.
 */

const bodySchema = z.object({ taskId: z.uuid(), regenerate: z.boolean().optional() });
const PACK_COLUMNS = 'id, task_id, content, created_at, reported_at';
/** Paquet d'une liste de vocabulaire photographiée, sans IA (voir create_vocabulary_cards). */
const LIST_MODEL = 'liste-photographiee';
/** Fenêtre des documents de l'enseignant pris en exemple pour un même cours. */
const COURSE_EXAMPLES_DAYS = 180;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  try {
    // La tablette de l'enfant peut faire préparer une fiche manquante de sa mission, sans la régénérer.
    const { familyId, deviceChildId } = await authenticateMember(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    const { taskId, regenerate } = body.data;

    const { data: task } = await admin
      .from('task')
      .select(
        'id, child_id, subject, kind, description, reference, status, curriculum_item_id, remediation, examples',
      )
      .eq('id', taskId)
      .eq('family_id', familyId)
      .maybeSingle();
    if (!task || (deviceChildId !== null && task.child_id !== deviceChildId))
      throw new UserFacingError('Tâche introuvable.', 404);
    if (deviceChildId !== null && regenerate)
      throw new UserFacingError('Seul le parent peut régénérer une fiche.', 403);
    if (task.status === 'draft') throw new UserFacingError("Validez d'abord la liste des tâches.", 409);

    const { data: existing } = await admin
      .from('study_pack')
      .select(`${PACK_COLUMNS}, model`)
      .eq('task_id', taskId)
      .maybeSingle();
    const { model: existingModel, ...existingPack } = existing ?? { model: null };
    if (existing && !regenerate && existingModel !== LIST_MODEL) return json({ pack: existingPack });

    // Liste de vocabulaire photographiée : ses cartes de mots sont gardées, l'IA complète autour.
    const { data: listCards } = existing
      ? await admin.from('flashcard').select('front, back').eq('pack_id', existing.id).eq('from_list', true)
      : { data: [] };
    const vocabulary = (listCards ?? []) as { front: string; back: string }[];

    const { data: child } = await admin
      .from('child_profile')
      .select('grade, track, needs, preferences')
      .eq('id', task.child_id)
      .single();
    if (!child) throw new Error('Profil introuvable');

    const { data: curriculum } = await admin
      .from('curriculum_item')
      .select('id, label')
      .contains('grades', [child.grade])
      .contains('tracks', [child.track])
      .in('subject', curriculumSubjects(task.subject))
      .eq('kind', 'attendu')
      // Ordre stable : deux demandes identiques donnent le même texte, donc la même empreinte (réutilisation).
      .order('code', { nullsFirst: false })
      .order('label')
      .order('id')
      .limit(60);

    const requestText = buildPackRequest({
      grade: child.grade,
      track: child.track,
      needs: child.needs ?? [],
      interests: interestLabels(child.preferences?.interests),
      task,
      curriculum: (curriculum ?? []).map((c) => c.label as string),
      vocabulary,
      teacherExamples: [...(task.examples ?? []), ...(await courseExamples(admin, task))],
    });
    const requestKey = await packRequestKey(requestText);

    // Demande identique déjà préparée (pour cette famille ou une autre) : la fiche est copiée, sans appel à l'IA
    // ni quota consommé. Jamais pour une régénération, ni à partir d'une fiche signalée, ni pour une liste.
    if (!regenerate && vocabulary.length === 0) {
      const { data: reusable } = await admin
        .from('study_pack')
        .select('content, model, curriculum_item_id')
        .eq('request_key', requestKey)
        .is('reported_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reusable) {
        const pack = await savePack(admin, {
          familyId,
          task,
          content: reusable.content as StudyPack,
          model: reusable.model as string,
          requestKey,
          curriculumItemId: reusable.curriculum_item_id as string | null,
          replace: existing?.id ?? null,
        });
        await admin.from('ai_usage').insert({
          family_id: familyId,
          function_name: 'generate-pack-reutilise',
          model: reusable.model,
          cost_usd: 0,
        });
        return json({ pack });
      }
    }

    const now = new Date();
    const [{ data: subscription }, { count }] = await Promise.all([
      admin
        .from('subscription')
        .select('plan, status, current_period_end')
        .eq('family_id', familyId)
        .maybeSingle(),
      // Quota compté sur le journal de consommation : supprimer une fiche ne rend pas de crédit.
      admin
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('function_name', 'generate-pack')
        .gte('created_at', startOfMonthBrussels(now)),
    ]);
    const problem = checkAccess(subscription as Subscription | null, count ?? 0, MONTHLY_PACK_QUOTA, now);
    if (problem) throw new UserFacingError(PACK_ACCESS_MESSAGES[problem], 402);

    const result = await generatePackFromRequest(requestText);
    const { content, curriculumIndex } = parsePackResponse(result.text, curriculum?.length ?? 0);
    const curriculumItemId = curriculumIndex !== null ? (curriculum![curriculumIndex]!.id as string) : null;

    const pack =
      existing && vocabulary.length > 0
        ? await completeListPack(admin, {
            familyId,
            task,
            packId: existing.id,
            listCards: vocabulary,
            content,
            model: result.model,
            requestKey,
            curriculumItemId,
          })
        : await savePack(admin, {
            familyId,
            task,
            content,
            model: result.model,
            requestKey,
            curriculumItemId,
            replace: existing?.id ?? null,
          });

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
    await reportServerError('generate-pack', error);
    return json({ error: 'La préparation a échoué. Réessayez dans un instant.' }, 500);
  }
});

interface PackTask {
  id: string;
  child_id: string;
  curriculum_item_id: string | null;
}

/**
 * Enregistre le paquet d'une tâche et ses cartes de révision, et rattache la tâche au programme (F2) sans
 * jamais remplacer un choix du parent. Régénération : l'ancien paquet et ses cartes sont remplacés.
 * Génération simultanée : le paquet déjà enregistré est renvoyé.
 */
async function savePack(
  admin: SupabaseClient,
  input: {
    familyId: string;
    task: PackTask;
    content: StudyPack;
    model: string;
    requestKey: string;
    curriculumItemId: string | null;
    replace: string | null;
  },
) {
  const { familyId, task, content } = input;
  if (input.replace) await admin.from('study_pack').delete().eq('id', input.replace);
  const { data: pack, error } = await admin
    .from('study_pack')
    .insert({
      family_id: familyId,
      child_id: task.child_id,
      task_id: task.id,
      content,
      model: input.model,
      request_key: input.requestKey,
      curriculum_item_id: input.curriculumItemId,
    })
    .select(PACK_COLUMNS)
    .single();
  if (error) {
    const { data: concurrent } = await admin
      .from('study_pack')
      .select(PACK_COLUMNS)
      .eq('task_id', task.id)
      .maybeSingle();
    if (concurrent) return concurrent;
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

  await attachCurriculum(admin, task, input.curriculumItemId);
  return pack;
}

/** Rattachement au programme (F2), sans jamais remplacer un choix du parent. */
async function attachCurriculum(admin: SupabaseClient, task: PackTask, curriculumItemId: string | null) {
  if (curriculumItemId && !task.curriculum_item_id) {
    await admin
      .from('task')
      .update({ curriculum_item_id: curriculumItemId })
      .eq('id', task.id)
      .is('curriculum_item_id', null);
  }
}

/**
 * Liste de vocabulaire complétée (ou régénérée) : le paquet est mis à jour sur place ; les cartes de mots de la liste
 * restent, avec la progression de l'enfant ; les autres cartes sont remplacées par les nouvelles.
 */
async function completeListPack(
  admin: SupabaseClient,
  input: {
    familyId: string;
    task: PackTask;
    packId: string;
    listCards: { front: string; back: string }[];
    content: StudyPack;
    model: string;
    requestKey: string;
    curriculumItemId: string | null;
  },
) {
  const key = (card: { front: string; back: string }) =>
    `${card.front.trim().toLocaleLowerCase('fr')}→${card.back.trim().toLocaleLowerCase('fr')}`;
  const listed = new Set(input.listCards.map(key));
  const fresh = input.content.flashcards.filter((card) => !listed.has(key(card)));
  const content = { ...input.content, flashcards: [...input.listCards, ...fresh] };

  const { data: pack, error } = await admin
    .from('study_pack')
    .update({
      content,
      model: input.model,
      request_key: input.requestKey,
      curriculum_item_id: input.curriculumItemId,
    })
    .eq('id', input.packId)
    .select(PACK_COLUMNS)
    .single();
  if (error) throw error;

  const { error: deleteError } = await admin
    .from('flashcard')
    .delete()
    .eq('pack_id', input.packId)
    .eq('from_list', false);
  if (deleteError) throw deleteError;
  if (fresh.length > 0) {
    const { error: cardsError } = await admin.from('flashcard').insert(
      fresh.map((card) => ({
        family_id: input.familyId,
        child_id: input.task.child_id,
        pack_id: input.packId,
        front: card.front,
        back: card.back,
      })),
    );
    if (cardsError) throw cardsError;
  }
  await attachCurriculum(admin, input.task, input.curriculumItemId);
  return pack;
}

/**
 * Questions de l'enseignant relevées sur les autres documents du même cours (exemples d'une interrogation ou de
 * notes, questions ratées d'une interrogation corrigée), les plus récentes d'abord.
 */
async function courseExamples(
  admin: SupabaseClient,
  task: { id: string; child_id: string; subject: string },
): Promise<string[]> {
  const since = new Date(Date.now() - COURSE_EXAMPLES_DAYS * 86_400_000).toISOString();
  const { data } = await admin
    .from('task')
    .select('examples, remediation')
    .eq('child_id', task.child_id)
    .ilike('subject', task.subject.replace(/[\\%_]/g, '\\$&'))
    .neq('id', task.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []).flatMap((row) => [
    ...((row.examples as string[] | null) ?? []),
    ...((row.remediation as { errors?: { question: string }[] } | null)?.errors ?? []).map((e) => e.question),
  ]);
}
