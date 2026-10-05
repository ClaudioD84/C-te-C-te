import {
  ACCESS_MESSAGES,
  checkScanAccess,
  startOfMonthBrussels,
  type Subscription,
} from '../_shared/access.ts';
import { extractTasksFromImage, SCAN_MODEL } from '../_shared/claude.ts';
import { z } from '../_shared/deps.ts';
import type { DocumentType } from '../_shared/extraction.ts';
import { corsHeaders, json, UserFacingError } from '../_shared/http.ts';
import { estimateCostUsd } from '../_shared/pricing.ts';
import { adminClient, authenticate } from '../_shared/supabase.ts';

/**
 * Analyse d'une photo (F3) : vérifie les droits, lit la photo floutée avec Claude,
 * enregistre les tâches en brouillon pour validation par le parent, puis supprime la photo.
 */

const bodySchema = z.object({ scanId: z.uuid() });
const BUCKET = 'scans';

interface ClaimedScan {
  id: string;
  child_id: string;
  document_type: DocumentType | null;
  storage_path: string | null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const admin = adminClient();
  let scanId: string | null = null;

  try {
    const { familyId } = await authenticate(request, admin);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new UserFacingError('Requête invalide.');
    scanId = body.data.scanId;

    // Réservation atomique de la photo : empêche deux analyses simultanées (voir claim_scan).
    const { data: claimed, error: claimError } = await admin.rpc('claim_scan', {
      p_scan_id: scanId,
      p_family_id: familyId,
    });
    if (claimError) throw claimError;
    const scan = (claimed as ClaimedScan[] | null)?.[0];
    if (!scan) {
      scanId = null; // rien à remettre en échec
      throw new UserFacingError('Cette photo est déjà en cours d’analyse ou a déjà été analysée.', 409);
    }
    if (!scan.storage_path) throw new UserFacingError('La photo a expiré. Reprenez-la.', 410);
    // Défense en profondeur (voir la contrainte scan_storage_path_family) : jamais hors du dossier de la famille.
    if (!scan.storage_path.startsWith(`${familyId}/`)) throw new UserFacingError('Photo introuvable.', 404);

    const now = new Date();
    const [{ data: subscription }, { count }] = await Promise.all([
      admin
        .from('subscription')
        .select('plan, status, current_period_end')
        .eq('family_id', familyId)
        .maybeSingle(),
      // Quota compté sur le journal de consommation, que seul le serveur écrit.
      admin
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('function_name', 'scan-extract')
        .gte('created_at', startOfMonthBrussels(now)),
    ]);
    const problem = checkScanAccess(subscription as Subscription | null, count ?? 0, now);
    if (problem) throw new UserFacingError(ACCESS_MESSAGES[problem], 402);

    const [{ data: child }, { data: file, error: downloadError }] = await Promise.all([
      admin.from('child_profile').select('grade').eq('id', scan.child_id).single(),
      admin.storage.from(BUCKET).download(scan.storage_path),
    ]);
    if (!child || downloadError || !file) throw new Error('Photo ou profil introuvable');

    const imageBase64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
    const { extraction, model, usage } = await extractTasksFromImage({
      imageBase64,
      grade: child.grade,
      documentType: scan.document_type,
      now,
    });

    if (extraction.tasks.length > 0) {
      const { error } = await admin.from('task').insert(
        extraction.tasks.map((task) => ({
          family_id: familyId,
          child_id: scan.child_id,
          scan_id: scan.id,
          subject: task.subject,
          kind: task.kind,
          description: task.description,
          due_date: task.dueDate,
          reference: task.reference,
          confidence: task.confidence,
          status: 'draft',
        })),
      );
      if (error) throw error;
    }

    await admin
      .from('scan')
      .update({
        status: 'draft',
        document_type: extraction.documentType,
        spelling_words: extraction.spellingWords.length > 0 ? extraction.spellingWords : null,
        storage_path: null,
        processed_at: now.toISOString(),
      })
      .eq('id', scan.id);
    // La photo n'est plus nécessaire : on la supprime immédiatement.
    await admin.storage.from(BUCKET).remove([scan.storage_path]);

    await admin.from('ai_usage').insert({
      family_id: familyId,
      function_name: 'scan-extract',
      model: model || SCAN_MODEL,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      cost_usd: estimateCostUsd(model || SCAN_MODEL, usage),
    });

    return json({ status: 'draft', tasks: extraction.tasks.length });
  } catch (error) {
    const userFacing = error instanceof UserFacingError;
    if (!userFacing) console.error('scan-extract', error);
    const message = userFacing ? error.message : "L'analyse a échoué. Réessayez dans un instant.";

    // La photo est conservée pour permettre de réessayer ; l'échec est visible dans l'application.
    if (scanId) await admin.from('scan').update({ status: 'failed', error: message }).eq('id', scanId);
    return json({ error: message }, userFacing ? error.status : 500);
  }
});

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
