import { json } from '../_shared/http.ts';
import { reportServerError } from '../_shared/monitoring.ts';
import { NOTIFICATION_MAX_AGE_HOURS, pushMessage, type NotificationKind } from '../_shared/push.ts';
import { hasBearerSecret } from '../_shared/secret.ts';
import { adminClient } from '../_shared/supabase.ts';

/**
 * Envoie les notifications en attente (demande d'aide, mission terminée) aux téléphones des parents de la
 * famille, sauf celui d'où vient l'action. Appelée par la base dès qu'un événement arrive (et toutes les
 * 5 minutes en rattrapage), protégée par le secret PURGE_SECRET.
 */
const EXPO_PUSH_URL = Deno.env.get('EXPO_PUSH_URL') ?? 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

interface PendingNotification {
  id: number;
  family_id: string;
  child_id: string;
  kind: NotificationKind;
  actor_user_id: string | null;
  created_at: string;
}

interface Ticket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

Deno.serve(async (request) => {
  if (!hasBearerSecret(request, Deno.env.get('PURGE_SECRET'))) return json({ error: 'Non autorisé' }, 401);
  const admin = adminClient();
  try {
    const { data: pending, error } = await admin
      .from('parent_notification')
      .select('id, family_id, child_id, kind, actor_user_id, created_at')
      .is('sent_at', null)
      .order('created_at')
      .limit(200);
    if (error) throw error;
    const notifications = (pending ?? []) as PendingNotification[];
    if (notifications.length === 0) return json({ sent: 0 });

    const staleBefore = Date.now() - NOTIFICATION_MAX_AGE_HOURS * 3600 * 1000;
    const fresh = notifications.filter((n) => new Date(n.created_at).getTime() >= staleBefore);
    const families = [...new Set(fresh.map((n) => n.family_id))];
    const children = [...new Set(fresh.map((n) => n.child_id))];
    const [{ data: tokens }, { data: profiles }] = await Promise.all([
      families.length > 0
        ? admin
            .from('push_token')
            .select('token, user_id, family_id, notify_help, notify_mission')
            .in('family_id', families)
        : Promise.resolve({ data: [] }),
      children.length > 0
        ? admin.from('child_profile').select('id, alias').in('id', children)
        : Promise.resolve({ data: [] }),
    ]);
    const alias = new Map((profiles ?? []).map((p) => [p.id as string, p.alias as string]));

    const messages: { to: string; title: string; body: string; sound: 'default'; priority: 'high' }[] = [];
    for (const n of fresh) {
      const name = alias.get(n.child_id);
      if (!name) continue;
      const text = pushMessage(n.kind, name);
      for (const t of tokens ?? []) {
        if (t.family_id !== n.family_id || t.user_id === n.actor_user_id) continue;
        if (n.kind === 'aide' ? !t.notify_help : !t.notify_mission) continue;
        messages.push({ to: t.token as string, ...text, sound: 'default', priority: 'high' });
      }
    }

    const unregistered: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const chunk = messages.slice(i, i + BATCH);
      const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) throw new Error(`Service de notifications : ${response.status}`);
      const tickets = ((await response.json()) as { data?: Ticket[] }).data ?? [];
      tickets.forEach((ticket, j) => {
        // Application désinstallée ou notifications coupées : le jeton ne sert plus.
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered')
          unregistered.push(chunk[j]!.to);
      });
    }
    if (unregistered.length > 0) await admin.from('push_token').delete().in('token', unregistered);

    await admin
      .from('parent_notification')
      .update({ sent_at: new Date().toISOString() })
      .in(
        'id',
        notifications.map((n) => n.id),
      );
    return json({ sent: messages.length, removed: unregistered.length });
  } catch (error) {
    await reportServerError('notify-parents', error);
    return json({ error: 'Envoi impossible.' }, 500);
  }
});
