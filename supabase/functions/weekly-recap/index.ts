import { emailConfigured, sendEmail } from '../_shared/email.ts';
import { json } from '../_shared/http.ts';
import { recapEmail, type ChildWeek } from '../_shared/recap.ts';
import { hasBearerSecret } from '../_shared/secret.ts';
import { adminClient } from '../_shared/supabase.ts';

interface Target {
  user_id: string;
  family_id: string;
  email: string;
}

/**
 * Bilan de la semaine par e-mail (dimanche soir), pour les parents qui l'ont demandé dans « Mon compte ».
 * Appelée par une tâche planifiée hebdomadaire, protégée par le secret PURGE_SECRET.
 * Un parent n'est servi qu'une fois tous les 6 jours, même si la tâche est relancée.
 */
Deno.serve(async (request) => {
  if (!hasBearerSecret(request, Deno.env.get('PURGE_SECRET'))) return json({ error: 'Non autorisé' }, 401);
  const report = { sent: 0, failures: 0, emailConfigured: emailConfigured() };
  if (!report.emailConfigured) return json(report);

  const admin = adminClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const { data, error } = await admin.rpc('weekly_recap_targets', { p_limit: 500 });
  if (error) return json({ error: error.message }, 500);

  const weeks = new Map<string, ChildWeek[]>();
  for (const target of data as Target[]) {
    try {
      if (!weeks.has(target.family_id))
        weeks.set(target.family_id, await familyWeek(target.family_id, since));
      const children = weeks.get(target.family_id)!;
      if (children.length > 0) {
        const { subject, text } = recapEmail(children);
        await sendEmail(target.email, subject, text);
        report.sent++;
      }
      await admin
        .from('parent')
        .update({ weekly_email_sent_at: new Date().toISOString() })
        .eq('user_id', target.user_id);
    } catch (e) {
      console.error('weekly-recap', target.family_id, e);
      report.failures++;
    }
  }
  return json(report);

  async function familyWeek(familyId: string, from: Date): Promise<ChildWeek[]> {
    const { data: children, error: childError } = await admin
      .from('child_profile')
      .select('id, alias')
      .eq('family_id', familyId)
      .order('created_at');
    if (childError) throw childError;
    const result: ChildWeek[] = [];
    for (const child of children) {
      const [{ data: events, error: eventError }, { data: stats }] = await Promise.all([
        admin
          .from('learning_event')
          .select('type, meta, created_at')
          .eq('child_id', child.id)
          .gte('created_at', from.toISOString()),
        admin.rpc('child_subject_stats', { p_child_id: child.id, p_since: from.toISOString().slice(0, 10) }),
      ]);
      if (eventError) throw eventError;
      const days = new Set(
        events.map((e) =>
          new Date(e.created_at as string).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' }),
        ),
      );
      result.push({
        alias: child.alias as string,
        effortDays: days.size,
        minutes: events.reduce((sum, e) => sum + Number((e.meta as { minutes?: number }).minutes ?? 0), 0),
        activities: events.filter((e) => e.type === 'activite').length,
        cards: events.filter((e) => e.type === 'carte').length,
        quizzes: events.filter((e) => e.type === 'quiz').length,
        subjects: ((stats ?? []) as { subject: string }[]).map((s) => s.subject),
      });
    }
    return result;
  }
});
