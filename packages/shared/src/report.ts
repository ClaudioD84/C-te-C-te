import type { BadgeCode, WeekEffort } from './rewards';
import { BADGES } from './rewards';

/**
 * Bilan de la semaine pour le parent (F7, F11) : uniquement ce qui a été fait, jamais ce qui manque ni de
 * comparaison. Le message pour l'enfant valorise l'effort et la régularité, pas les résultats.
 */
export interface WeeklyReport {
  highlights: string[];
  childMessage: string;
  shareText: string;
}

const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n > 1 ? pluralForm : singular}`;

export function weeklyReport(input: {
  alias: string;
  week: WeekEffort;
  subjects: readonly string[];
  badges: readonly BadgeCode[];
  kindergarten?: boolean;
}): WeeklyReport {
  const { alias, week } = input;
  const highlights: string[] = [];
  if (week.effortDays > 0) highlights.push(`${plural(week.effortDays, 'jour')} de travail`);
  if (week.minutes > 0) highlights.push(`${week.minutes} minutes au total`);
  if (week.activities > 0)
    highlights.push(
      input.kindergarten
        ? `${plural(week.activities, 'activité faite', 'activités faites')} ensemble`
        : plural(week.activities, 'activité terminée', 'activités terminées'),
    );
  if (week.cards > 0) highlights.push(plural(week.cards, 'carte revue', 'cartes revues'));
  if (week.quizzes > 0) highlights.push(plural(week.quizzes, 'quiz fait', 'quiz faits'));
  if (input.subjects.length > 0) highlights.push(`Matières travaillées : ${input.subjects.join(', ')}`);
  for (const code of input.badges) highlights.push(`Badge ${BADGES[code].emoji} ${BADGES[code].title}`);

  let childMessage: string;
  if (week.effortDays >= 3) {
    childMessage = `Bravo ${alias} ! Tu as travaillé ${week.effortDays} jours cette semaine : c'est ça, la régularité. On est fiers de toi.`;
  } else if (week.effortDays > 0) {
    childMessage = `Bravo ${alias} ! Chaque moment de travail compte, et tu en as fait ${week.effortDays === 1 ? 'un' : 'plusieurs'} cette semaine.`;
  } else {
    childMessage = `Une nouvelle semaine commence, ${alias} : on s'y met ensemble, un petit pas à la fois ?`;
  }

  const shareText = [
    `Semaine de ${alias} sur Côte à Côte`,
    ...(highlights.length > 0 ? highlights.map((h) => `• ${h}`) : ['• Pas encore d’activité cette semaine.']),
    '',
    childMessage,
  ].join('\n');

  return { highlights, childMessage, shareText };
}
