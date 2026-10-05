import type { SupabaseClient } from '../_shared/deps.ts';
import { emailConfigured, sendEmail } from '../_shared/email.ts';
import { json } from '../_shared/http.ts';
import { hasBearerSecret } from '../_shared/secret.ts';
import { deletionDate, retentionDecision, warningEmail } from '../_shared/retention.ts';
import { adminClient } from '../_shared/supabase.ts';

interface InactiveFamily {
  family_id: string;
  last_active_at: string;
  inactivity_warned_at: string | null;
  paid_until: string | null;
  emails: string[];
}

/** Supprime une famille : photos restantes, puis chaque parent (la famille suit par cascade). */
async function deleteFamily(admin: SupabaseClient, familyId: string) {
  const { data: files } = await admin.storage.from('scans').list(familyId, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from('scans').remove(files.map((f) => `${familyId}/${f.name}`));
  }
  const { data: parents, error } = await admin.from('parent').select('user_id').eq('family_id', familyId);
  if (error) throw error;
  for (const parent of parents) {
    const deleted = await admin.auth.admin.deleteUser(parent.user_id as string);
    if (deleted.error) throw deleted.error;
  }
  // Famille sans parent (cas anormal) : suppression directe.
  if (parents.length === 0) await admin.from('family').delete().eq('id', familyId);
}

/**
 * Purge quotidienne de la conservation (RGPD) : journal de l'effort de plus de 2 ans, comptes inactifs
 * depuis 24 mois (avertissement par e-mail, puis suppression 30 jours plus tard sans reconnexion).
 * Sans service d'e-mail configuré, aucun compte n'est averti ni supprimé.
 * Appelée par une tâche planifiée, protégée par le secret PURGE_SECRET.
 */
Deno.serve(async (request) => {
  if (!hasBearerSecret(request, Deno.env.get('PURGE_SECRET'))) return json({ error: 'Non autorisé' }, 401);

  const admin = adminClient();
  const now = new Date();
  const report = { events: 0, warned: 0, deleted: 0, failures: 0, emailConfigured: emailConfigured() };

  const events = await admin.rpc('purge_old_learning_events');
  if (events.error) return json({ error: events.error.message }, 500);
  report.events = events.data as number;

  if (!report.emailConfigured) return json(report);

  const { data, error } = await admin.rpc('inactive_families', { p_limit: 200 });
  if (error) return json({ error: error.message }, 500);

  for (const family of data as InactiveFamily[]) {
    const decision = retentionDecision(
      {
        lastActiveAt: new Date(family.last_active_at),
        warnedAt: family.inactivity_warned_at ? new Date(family.inactivity_warned_at) : null,
        paidUntil: family.paid_until ? new Date(family.paid_until) : null,
      },
      now,
    );
    try {
      if (decision === 'warn') {
        const email = warningEmail(deletionDate(now));
        for (const to of family.emails) await sendEmail(to, email.subject, email.text);
        const updated = await admin
          .from('family')
          .update({ inactivity_warned_at: now.toISOString() })
          .eq('id', family.family_id);
        if (updated.error) throw updated.error;
        report.warned += 1;
      } else if (decision === 'delete') {
        await deleteFamily(admin, family.family_id);
        report.deleted += 1;
      }
    } catch (failure) {
      console.error('purge-inactive', family.family_id, failure);
      report.failures += 1;
    }
  }
  return json(report);
});
