import { json } from '../_shared/http.ts';
import { hasBearerSecret } from '../_shared/secret.ts';
import { adminClient } from '../_shared/supabase.ts';

/**
 * Âge à partir duquel une photo non traitée (échec, application fermée pendant l'envoi…) est effacée. La tâche
 * passe toutes les heures : avec 23 heures, aucune photo ne reste plus de 24 heures (promesse de la politique).
 */
const MAX_AGE_HOURS = 23;
const BUCKET = 'scans';

/**
 * Purge horaire (RGPD, limitation de la conservation) : une photo est normalement supprimée dès son
 * analyse ; celles restées en stockage sont effacées ici avant 24 heures.
 * Efface aussi les codes de liaison d'appareil expirés et le journal des codes erronés (adresses IP
 * hachées) de plus d'un jour.
 * Appelée par la tâche programmée `purge-photos` (pg_cron, voir la migration scheduled_jobs), protégée par le
 * secret PURGE_SECRET.
 */
Deno.serve(async (request) => {
  if (!hasBearerSecret(request, Deno.env.get('PURGE_SECRET'))) return json({ error: 'Non autorisé' }, 401);

  const admin = adminClient();
  const limit = new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000).toISOString();
  const { data: scans, error } = await admin
    .from('scan')
    .select('id, status, storage_path')
    .not('storage_path', 'is', null)
    .lt('created_at', limit)
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  const paths = scans.map((s) => s.storage_path as string);
  if (paths.length > 0) {
    const removed = await admin.storage.from(BUCKET).remove(paths);
    if (removed.error) return json({ error: removed.error.message }, 500);
    const updated = await admin
      .from('scan')
      .update({
        storage_path: null,
        status: 'failed',
        error: 'Photo supprimée : non analysée dans les 24 heures.',
      })
      .in(
        'id',
        scans
          .filter((s) => s.status === 'uploaded' || s.status === 'processing' || s.status === 'failed')
          .map((s) => s.id),
      );
    if (updated.error) return json({ error: updated.error.message }, 500);
    // Analyse terminée mais photo restée (cas exceptionnel) : on garde le statut.
    await admin
      .from('scan')
      .update({ storage_path: null })
      .in(
        'id',
        scans.map((s) => s.id),
      );
  }

  // Même tâche : codes de liaison expirés et essais erronés de plus d'un jour.
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await admin.from('device_pairing').delete().lt('expires_at', new Date().toISOString());
  await admin.from('device_pairing_failure').delete().lt('created_at', yesterday);

  return json({ purged: paths.length });
});
