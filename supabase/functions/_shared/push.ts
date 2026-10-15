/**
 * Messages des notifications au parent. Texte sobre : il peut s'afficher sur l'écran verrouillé et transite par
 * le service de notifications d'Expo puis d'Apple ou de Google. Le prénom seulement : ni la matière, ni la
 * tâche, ni aucune donnée de santé.
 */
export type NotificationKind = 'aide' | 'mission';

export function pushMessage(kind: NotificationKind, alias: string): { title: string; body: string } {
  return kind === 'aide'
    ? { title: `🙋 ${alias} a besoin d'aide`, body: 'Ouvrez Côte à Côte pour voir sur quelle activité.' }
    : { title: `✅ ${alias} a terminé sa mission du jour`, body: 'Bravo ! Un petit mot pour le féliciter ?' };
}

/** Au-delà, l'événement n'a plus d'intérêt (téléphone injoignable longtemps, secrets ajoutés plus tard). */
export const NOTIFICATION_MAX_AGE_HOURS = 6;
