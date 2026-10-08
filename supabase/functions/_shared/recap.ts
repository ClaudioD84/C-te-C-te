/**
 * Bilan de la semaine par e-mail : uniquement ce qui a été fait, jamais de comparaison ni de reproche
 * (même esprit que le bilan affiché dans l'application, packages/shared/src/report.ts).
 */
export interface ChildWeek {
  alias: string;
  effortDays: number;
  minutes: number;
  activities: number;
  cards: number;
  quizzes: number;
  subjects: string[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function childLines(week: ChildWeek): string[] {
  const lines: string[] = [];
  if (week.effortDays > 0) lines.push(`${plural(week.effortDays, 'jour')} de travail`);
  if (week.minutes > 0) lines.push(`${week.minutes} minutes au total`);
  if (week.activities > 0) lines.push(plural(week.activities, 'activité terminée', 'activités terminées'));
  if (week.cards > 0) lines.push(plural(week.cards, 'carte revue', 'cartes revues'));
  if (week.quizzes > 0) lines.push(plural(week.quizzes, 'quiz fait', 'quiz faits'));
  if (week.subjects.length > 0) lines.push(`Matières travaillées : ${week.subjects.join(', ')}`);
  return lines;
}

function encouragement(week: ChildWeek): string {
  if (week.effortDays >= 3)
    return `Bravo ${week.alias} ! Tu as travaillé ${week.effortDays} jours cette semaine : c'est ça, la régularité.`;
  if (week.effortDays > 0) return `Bravo ${week.alias} ! Chaque moment de travail compte.`;
  return `Une nouvelle semaine commence, ${week.alias} : on s'y met ensemble, un petit pas à la fois ?`;
}

export function recapEmail(children: readonly ChildWeek[]): { subject: string; text: string } {
  const blocks = children.map((week) => {
    const lines = childLines(week);
    return [
      week.alias,
      ...(lines.length > 0 ? lines.map((l) => `• ${l}`) : ['• Pas encore d’activité cette semaine.']),
      `À lui dire : « ${encouragement(week)} »`,
    ].join('\n');
  });
  return {
    subject: 'La semaine sur Côte à Côte',
    text: [
      'Bonjour,',
      '',
      'Voici ce que vos enfants ont fait cette semaine sur Côte à Côte.',
      '',
      blocks.join('\n\n'),
      '',
      'Bonne semaine !',
      '',
      'Pour ne plus recevoir ce bilan : Mon compte > « Bilan de la semaine par e-mail ».',
    ].join('\n'),
  };
}
