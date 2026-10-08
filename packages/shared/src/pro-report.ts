import { addDays, daysBetween, formatShortDate, type IsoDate } from './dates';
import type { LearningSettings } from './learning-settings';
import { escapeHtml } from './print';
import type { SubjectProgress } from './progress';

/**
 * Bilan pour un professionnel (logopède, PMS, enseignant) : un document du trimestre que le parent compose
 * lui-même (il choisit chaque partie). Prénom seulement ; les besoins particuliers n'y figurent que si
 * le parent les coche. Des faits observés, sans jugement ni diagnostic.
 */
export const PRO_REPORT_SECTIONS = ['effort', 'matieres', 'aide', 'lecture', 'besoins'] as const;
export type ProReportSection = (typeof PRO_REPORT_SECTIONS)[number];

export const PRO_REPORT_SECTION_LABELS: Record<ProReportSection, string> = {
  effort: 'Régularité et temps de travail',
  matieres: 'Matières travaillées et quiz',
  aide: 'Demandes d’aide (activités difficiles)',
  lecture: 'Lecture à voix haute',
  besoins: 'Besoins particuliers et adaptations',
};

/** Parties cochées par défaut : les besoins particuliers (donnée de santé) jamais d'office. */
export const DEFAULT_PRO_REPORT_SECTIONS: readonly ProReportSection[] = [
  'effort',
  'matieres',
  'aide',
  'lecture',
];

export interface EffortSummary {
  days: number;
  minutes: number;
  activities: number;
  cards: number;
  quizzes: number;
  /** Jours de travail par semaine, en moyenne sur la période. */
  daysPerWeek: number;
}

export function effortSummary(
  days: readonly { date: IsoDate; activities: number; cards: number; quizzes: number; minutes?: number }[],
  from: IsoDate,
  to: IsoDate,
): EffortSummary {
  const inPeriod = days.filter((d) => d.date >= from && d.date <= to);
  const worked = inPeriod.filter((d) => d.activities + d.cards + d.quizzes > 0);
  const weeks = Math.max(1, (daysBetween(from, to) + 1) / 7);
  return {
    days: worked.length,
    minutes: inPeriod.reduce((s, d) => s + (d.minutes ?? 0), 0),
    activities: inPeriod.reduce((s, d) => s + d.activities, 0),
    cards: inPeriod.reduce((s, d) => s + d.cards, 0),
    quizzes: inPeriod.reduce((s, d) => s + d.quizzes, 0),
    daysPerWeek: Math.round((worked.length / weeks) * 10) / 10,
  };
}

/** Début de période : les 3 derniers mois, ou depuis la rentrée (fin août). */
export function proReportStart(today: IsoDate, period: 'trimestre' | 'annee'): IsoDate {
  if (period === 'trimestre') return addDays(today, -91);
  const year = Number(today.slice(0, 4));
  const start = `${today.slice(5) >= '08-25' ? year : year - 1}-08-25`;
  return start;
}

export interface ProReportInput {
  alias: string;
  gradeLabel: string;
  from: IsoDate;
  to: IsoDate;
  sections: readonly ProReportSection[];
  effort?: EffortSummary;
  subjects?: readonly SubjectProgress[];
  help?: readonly { subject: string; count: number }[];
  reading?: readonly { date: IsoDate; wpm: number; hardWords: readonly string[] }[];
  needs?: readonly string[];
  adaptations?: readonly string[];
  comment?: string;
}

export function buildProReportHtml(input: ProReportInput): string {
  const e = escapeHtml;
  const has = (s: ProReportSection) => input.sections.includes(s);
  const parts: string[] = [];

  if (has('effort') && input.effort) {
    const f = input.effort;
    parts.push(`<h2>${e(PRO_REPORT_SECTION_LABELS.effort)}</h2>
<ul>
  <li>${f.days} jours de travail à la maison (${f.daysPerWeek} par semaine en moyenne)</li>
  <li>${f.minutes} minutes d’activités notées</li>
  <li>${f.activities} activités terminées, ${f.cards} cartes de révision revues, ${f.quizzes} quiz</li>
</ul>`);
  }
  if (has('matieres') && input.subjects && input.subjects.length > 0) {
    const rows = input.subjects
      .map(
        (s) =>
          `<tr><td>${e(s.subject)}</td><td>${s.minutes} min</td><td>${s.activities}</td><td>${
            s.quizRate === null ? '—' : `${s.quizRate} % (${s.quizScore}/${s.quizTotal})`
          }</td></tr>`,
      )
      .join('');
    parts.push(`<h2>${e(PRO_REPORT_SECTION_LABELS.matieres)}</h2>
<table><thead><tr><th>Matière</th><th>Temps</th><th>Activités</th><th>Réussite aux quiz</th></tr></thead>
<tbody>${rows}</tbody></table>`);
  }
  if (has('aide')) {
    const help = input.help ?? [];
    parts.push(`<h2>${e(PRO_REPORT_SECTION_LABELS.aide)}</h2>
${
  help.length === 0
    ? '<p>Aucune demande d’aide sur la période.</p>'
    : `<ul>${help.map((h) => `<li>${e(h.subject)} : ${h.count} demande${h.count > 1 ? 's' : ''}</li>`).join('')}</ul>`
}`);
  }
  if (has('lecture') && input.reading && input.reading.length > 0) {
    const hard = [...new Set(input.reading.flatMap((r) => r.hardWords))].slice(0, 40);
    parts.push(`<h2>${e(PRO_REPORT_SECTION_LABELS.lecture)}</h2>
<p>Mots lus par minute, lecture après lecture (textes courts de son niveau, mots difficiles notés par le parent).</p>
<ul>${input.reading.map((r) => `<li>${e(formatShortDate(r.date))} : ${r.wpm} mots/min</li>`).join('')}</ul>
${hard.length > 0 ? `<p>Mots difficiles relevés : ${e(hard.join(', '))}</p>` : ''}`);
  }
  if (has('besoins') && ((input.needs?.length ?? 0) > 0 || (input.adaptations?.length ?? 0) > 0)) {
    parts.push(`<h2>${e(PRO_REPORT_SECTION_LABELS.besoins)}</h2>
${input.needs?.length ? `<p>Besoins signalés par le parent : ${e(input.needs.join(', '))}</p>` : ''}
${input.adaptations?.length ? `<ul>${input.adaptations.map((a) => `<li>${e(a)}</li>`).join('')}</ul>` : ''}`);
  }
  if (input.comment?.trim()) {
    parts.push(`<h2>Remarques du parent</h2><p>${e(input.comment.trim())}</p>`);
  }

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Bilan de ${e(input.alias)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Verdana, sans-serif; color: #1d2733; font-size: 13px; line-height: 1.5; }
  h1 { color: #1b6e5a; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #1b6e5a; font-size: 16px; margin-top: 20px; border-bottom: 1px solid #d9d2c5; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d9d2c5; padding: 4px 8px; text-align: left; }
  .meta { color: #556270; }
  footer { margin-top: 24px; color: #556270; font-size: 11px; }
</style></head>
<body>
  <h1>Bilan du travail à la maison : ${e(input.alias)}</h1>
  <p class="meta">${e(input.gradeLabel)} · du ${e(formatShortDate(input.from))} au ${e(formatShortDate(input.to))}</p>
  ${parts.join('\n')}
  <footer>Document préparé par le parent avec Côte à Côte, à partir de ce que l’enfant a fait dans l’application.
  Ce n’est ni une évaluation scolaire ni un avis médical.</footer>
</body></html>`;
}

/** Adaptations appliquées par l'application, en phrases simples (partie « besoins », si cochée). */
export function adaptationLines(settings: LearningSettings): string[] {
  const lines = [`Séances de ${settings.workMinutes} minutes, pauses de ${settings.breakMinutes} minutes`];
  if (settings.fontFamily === 'dyslexia')
    lines.push('Police adaptée à la lecture, lettres et lignes espacées');
  if (settings.maxItemsPerScreen === 1) lines.push('Une consigne à la fois à l’écran');
  if (settings.readAloud) lines.push('Lecture vocale des consignes proposée');
  if (settings.pictograms) lines.push('Pictogrammes avec le texte');
  if (settings.visualMath) lines.push('Supports visuels en mathématiques');
  if (!settings.timedExercises) lines.push('Pas d’exercices chronométrés');
  return lines;
}
