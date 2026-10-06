import { addDays, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';

/**
 * Plan de blocus (examens de décembre et de juin, secondaire surtout) : chaque examen a sa date et ses
 * chapitres. Les chapitres sont répartis du lendemain jusqu'à l'avant-veille de chaque examen, l'examen
 * le plus proche d'abord, en alternant les matières ; la veille, une révision express de la matière.
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
  /** Jour où la révision doit être faite (échéance de la tâche). */
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

/** Chapitres saisis (un par ligne) ; à défaut, des parties numérotées. */
export function blocusChapters(text: string, subject: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 15);
  return lines.length > 0
    ? lines
    : Array.from({ length: DEFAULT_BLOCUS_CHAPTERS }, (_, i) => `${subject}, partie ${i + 1}`);
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
        dueDate: day,
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
        dueDate: addDays(late.exam.date, -1),
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
      dueDate: addDays(late.exam.date, -1),
      examDate: late.exam.date,
    });
  }

  for (const exam of exams) {
    tasks.push({
      subject: exam.subject,
      kind: 'examen',
      description: `Veille d’examen de ${exam.subject} : relire ses synthèses et refaire les exercices ratés`,
      dueDate: addDays(exam.date, -1) > input.today ? addDays(exam.date, -1) : exam.date,
      examDate: exam.date,
    });
  }
  return { tasks: tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate)), overloaded };
}
