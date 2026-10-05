import type { QueryClient } from '@tanstack/react-query';

import type { LearningEventType } from '@/features/rewards/api';
import { supabase } from '@/lib/supabase';

/**
 * Actions de l'enfant utilisables hors connexion (exigence 6.3) : elles sont mises en file d'attente,
 * gardées sur l'appareil et envoyées au retour du réseau, même après un redémarrage de l'application.
 *
 * Pour pouvoir être rejouées, chaque action est décrite par des variables autonomes (identifiants, valeurs
 * calculées, heure réelle de l'action) et sa fonction est enregistrée une fois pour toutes ici.
 * Chaque envoi est idempotent : le rejouer après une réponse perdue ne crée pas de doublon.
 */
export const OFFLINE_MUTATIONS = {
  completeItem: ['hors-ligne', 'activite'],
  reviewCard: ['hors-ligne', 'carte'],
  learningEvent: ['hors-ligne', 'evenement'],
} as const;

export interface PendingEvent {
  /** Identifiant généré sur l'appareil : évite un doublon si l'envoi est rejoué. */
  id: string;
  type: LearningEventType;
  meta: Record<string, unknown>;
}

export interface LearningEventVariables extends PendingEvent {
  childId: string;
  /** Heure réelle de l'effort (et non celle de l'envoi), pour les récompenses du bon jour. */
  at: string;
}

export interface CompleteItemVariables {
  childId: string;
  sessionId: string;
  taskId: string;
  doneAt: string;
  /** Dernière activité de la session : la session passe à « faite ». */
  closesSession: boolean;
  events: PendingEvent[];
}

export interface ReviewCardVariables {
  childId: string;
  cardId: string;
  next: { intervalDays: number; ease: number; repetitions: number; dueOn: string };
  reviewedAt: string;
  event: PendingEvent;
}

/** Erreur de réseau (à réessayer) plutôt que refus du serveur (inutile d'insister). */
export function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? '');
  return /network|fetch|timeout|connexion|load failed/i.test(message);
}

async function sendEvent({ id, childId, type, meta, at }: LearningEventVariables) {
  const { error } = await supabase.from('learning_event').upsert(
    { client_id: id, child_id: childId, type, meta, created_at: at },
    {
      onConflict: 'client_id',
      ignoreDuplicates: true,
    },
  );
  // Un événement ne sert qu'aux récompenses : un refus du serveur ne bloque pas la file d'attente.
  if (error && isNetworkError(error)) throw error;
}

async function completeItem(v: CompleteItemVariables) {
  const { error } = await supabase
    .from('study_session_task')
    .update({ done_at: v.doneAt })
    .eq('session_id', v.sessionId)
    .eq('task_id', v.taskId)
    .is('done_at', null);
  if (error) throw error;
  if (v.closesSession) {
    const update = await supabase.from('study_session').update({ status: 'done' }).eq('id', v.sessionId);
    if (update.error) throw update.error;
  }
  for (const event of v.events) await sendEvent({ ...event, childId: v.childId, at: v.doneAt });
}

async function reviewCard(v: ReviewCardVariables) {
  const { error } = await supabase
    .from('flashcard')
    .update({
      interval_days: v.next.intervalDays,
      ease: v.next.ease,
      repetitions: v.next.repetitions,
      due_on: v.next.dueOn,
      last_reviewed_at: v.reviewedAt,
    })
    .eq('id', v.cardId);
  if (error) throw error;
  await sendEvent({ ...v.event, childId: v.childId, at: v.reviewedAt });
}

const retry = (failures: number, error: unknown) => failures < 5 && isNetworkError(error);

/** À appeler à la création du client, avant de restaurer la file d'attente gardée sur l'appareil. */
export function registerOfflineMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(OFFLINE_MUTATIONS.completeItem, { mutationFn: completeItem, retry });
  queryClient.setMutationDefaults(OFFLINE_MUTATIONS.reviewCard, { mutationFn: reviewCard, retry });
  queryClient.setMutationDefaults(OFFLINE_MUTATIONS.learningEvent, { mutationFn: sendEvent, retry });
}
