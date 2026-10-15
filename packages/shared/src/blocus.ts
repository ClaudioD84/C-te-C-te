import { addDays, weekdayKey, type IsoDate } from './dates';
import { isMockExam, mockExamDescription } from './revision';
import type { Weekday } from './profile';

/**
 * Plan de blocus (examens de décembre et de juin, secondaire surtout) : chaque examen a sa date et ses
 * chapitres. Les chapitres sont répartis du lendemain jusqu'à l'avant-veille de chaque examen, l'examen
 * le plus proche d'abord, en alternant les matières ; la veille, un examen blanc de la matière (une séance
 * d'environ 40 minutes, posée ce jour-là par le planning).
 * Jours plus légers : le jour d'un examen et le dimanche (un seul chapitre).
 */
export interface BlocusExam {
  subject: string;
  date: IsoDate;
  chapters: readonly string[];
}

export interface BlocusTask {
  subject: string;
  kind: 'lecon' | 'examen';
  description: string;
  /** Jour prévu pour cette révision (aperçu). */
  day: IsoDate;
  /**
   * Échéance donnée au planning : le lendemain du jour prévu pour un chapitre (révisé au plus tard ce
   * jour-là), le jour même pour l'examen blanc de la veille (séance posée ce jour précis).
   */
  dueDate: IsoDate;
  /** Examen auquel la tâche se rattache. */
  examDate: IsoDate;
}

export interface BlocusPlan {
  tasks: BlocusTask[];
  /** Chapitres qui n'ont pas trouvé de place avant leur examen : le plan est trop serré. */
  overloaded: number;
}

export const BLOCUS_CHAPTERS_PER_DAY = 2;
export const DEFAULT_BLOCUS_CHAPTERS = 3;

/** Examen blanc sans chapitre nommé : il porte sur toute la matière. */
export const WHOLE_SUBJECT = 'toute la matière';

const genericChapter = (subject: string, n: number) => `${subject}, partie ${n}`;

function isGenericChapter(chapter: string, subject: string): boolean {
  const prefix = `${subject}, partie `;
  return chapter.startsWith(prefix) && /^\d+$/.test(chapter.slice(prefix.length));
}

/**
 * Faut-il préparer une fiche (IA) pour cette tâche ? Pas pour un chapitre sans nom (« Histoire, partie 2 »)
 * ni pour l'examen blanc d'une matière sans chapitre nommé : la fiche serait vague et coûterait du quota.
 */
export function needsStudyPack(task: { subject: string; description: string }): boolean {
  if (task.description.startsWith('Revoir : ')) {
    return !isGenericChapter(task.description.slice('Revoir : '.length), task.subject);
  }
  return !(isMockExam(task.description) && task.description.endsWith(`: ${WHOLE_SUBJECT}`));
}

/**
 * Samedis et dimanches à ajouter au planning de la semaine : pendant un blocus « avec week-end », jusqu'au
 * dernier examen (s'ils ne sont pas déjà des jours de travail).
 */
export function blocusWeekendDates(
  exams: readonly { exam_date: IsoDate; weekend_work?: boolean | null }[],
  today: IsoDate,
  availableDays: readonly Weekday[],
  horizon = 7,
): IsoDate[] {
  const last = exams
    .filter((e) => e.weekend_work)
    .map((e) => e.exam_date)
    .sort()
    .at(-1);
  if (!last) return [];
  const dates: IsoDate[] = [];
  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    const day = weekdayKey(date);
    if ((day === 'sam' || day === 'dim') && !availableDays.includes(day) && date < last) dates.push(date);
  }
  return dates;
}

/** Chapitres saisis (un par ligne) ; à défaut, des parties numérotées. */
export function blocusChapters(text: string, subject: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 15);
  return lines.length > 0
    ? lines
    : Array.from({ length: DEFAULT_BLOCUS_CHAPTERS }, (_, i) => genericChapter(subject, i + 1));
}

export function planBlocus(input: {
  exams: readonly BlocusExam[];
  today: IsoDate;
  availableDays: readonly Weekday[];
}): BlocusPlan {
  const exams = [...input.exams]
    .filter((e) => e.date > input.today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const examDays = new Set(exams.map((e) => e.date));
  const available = new Set(input.availableDays);
  const capacity = (day: IsoDate) =>
    examDays.has(day) || weekdayKey(day) === 'dim' ? 1 : BLOCUS_CHAPTERS_PER_DAY;

  // Chapitres en attente, avec leur dernier jour possible (avant-veille, ou veille si l'examen est proche).
  const pending = exams.flatMap((exam) =>
    exam.chapters.map((chapter) => ({
      exam,
      chapter,
      deadline: addDays(exam.date, addDays(input.today, 2) < exam.date ? -2 : -1),
    })),
  );
  const tasks: BlocusTask[] = [];
  let overloaded = 0;
  const lastDay = exams.at(-1)?.date ?? input.today;

  for (let day = addDays(input.today, 1); day < lastDay && pending.length > 0; day = addDays(day, 1)) {
    if (!available.has(weekdayKey(day))) continue;
    const subjectsToday = new Set<string>();
    for (let slot = 0; slot < capacity(day) && pending.length > 0; slot++) {
      // Examen le plus proche d'abord ; une autre matière que celle déjà vue aujourd'hui si possible.
      const candidates = pending.filter((p) => p.deadline >= day);
      const pick =
        candidates.find(
          (p) => !subjectsToday.has(p.exam.subject) && p.exam.date === candidates[0]!.exam.date,
        ) ??
        candidates.find((p) => !subjectsToday.has(p.exam.subject)) ??
        candidates[0];
      if (!pick) break;
      // Même matière deux fois le même jour seulement si les jours suivants ne suffiraient pas.
      if (subjectsToday.has(pick.exam.subject)) {
        const due = pending.filter((p) => p.deadline <= pick.deadline).length;
        let room = 0;
        for (let d = addDays(day, 1); d <= pick.deadline; d = addDays(d, 1)) {
          if (available.has(weekdayKey(d))) room += capacity(d);
        }
        if (due <= room) break;
      }
      pending.splice(pending.indexOf(pick), 1);
      subjectsToday.add(pick.exam.subject);
      tasks.push({
        subject: pick.exam.subject,
        kind: 'lecon',
        description: `Revoir : ${pick.chapter}`,
        day,
        dueDate: addDays(day, 1),
        examDate: pick.exam.date,
      });
    }
    // Les chapitres dont le dernier jour est passé sont posés la veille de leur examen.
    for (const late of pending.filter((p) => p.deadline <= day)) {
      pending.splice(pending.indexOf(late), 1);
      overloaded++;
      tasks.push({
        subject: late.exam.subject,
        kind: 'lecon',
        description: `Revoir : ${late.chapter}`,
        day: addDays(late.exam.date, -1),
        dueDate: late.exam.date,
        examDate: late.exam.date,
      });
    }
  }
  for (const late of pending) {
    overloaded++;
    tasks.push({
      subject: late.exam.subject,
      kind: 'lecon',
      description: `Revoir : ${late.chapter}`,
      day: addDays(late.exam.date, -1),
      dueDate: late.exam.date,
      examDate: late.exam.date,
    });
  }

  for (const exam of exams) {
    // Examen blanc la veille (s'il reste au moins un jour avant l'examen).
    const eve = addDays(exam.date, -1);
    if (eve <= input.today) continue;
    const named = exam.chapters.filter((c) => !isGenericChapter(c, exam.subject));
    tasks.push({
      subject: exam.subject,
      kind: 'examen',
      description: mockExamDescription(exam.subject, named.length > 0 ? named : [WHOLE_SUBJECT]),
      day: eve,
      dueDate: eve,
      examDate: exam.date,
    });
  }
  return { tasks: tasks.sort((a, b) => a.day.localeCompare(b.day)), overloaded };
}
