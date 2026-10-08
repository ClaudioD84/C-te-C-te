import { addDays, daysBetween, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';
import { gradeYear, schoolLevel, type Grade } from './school';
import type { TaskKind } from './task';

/**
 * Planning hebdomadaire et régulation de la charge (F4, F8).
 * Algorithme déterministe : il répartit le temps de préparation de chaque tâche
 * sur les jours disponibles avant l'échéance, puis lisse les jours trop chargés.
 */

export interface PlannableTask {
  id: string;
  subject: string;
  kind: TaskKind;
  dueDate: IsoDate;
  /** Minutes déjà travaillées sur cette tâche lors de sessions précédentes. */
  doneMinutes?: number;
  /** Examen blanc d'un dossier de révision (F5) : passé en une fois, le jour prévu. */
  mockExam?: boolean;
}

export type Activity = 'faire' | 'etudier' | 'reviser' | 'se_tester';

export interface PlannedItem {
  taskId: string;
  minutes: number;
  activity: Activity;
}

export interface PlannedDay {
  date: IsoDate;
  items: PlannedItem[];
  totalMinutes: number;
}

export type PlanningAlert =
  | { type: 'surcharge'; date: IsoDate; overMinutes: number }
  | { type: 'evaluations_rapprochees'; date: IsoDate; count: number }
  | { type: 'week_end_conseille'; dates: IsoDate[] }
  /** Tâches dont toute la préparation tombe pendant un congé : à caser avant ou après. */
  | { type: 'conge'; count: number }
  /** Semaine chargée : tâches reportées au prochain planning. */
  | { type: 'reporte'; count: number };

export interface PlanningInput {
  tasks: readonly PlannableTask[];
  today: IsoDate;
  grade: Grade;
  availableDays: readonly Weekday[];
  /** Durée d'une période de travail (Pomodoro) : plus petite unité de planification. */
  workMinutes: number;
  /** Temps de travail maximal par jour ; sinon calculé selon l'âge. */
  dailyCapacityMinutes?: number;
  /** Nombre de jours planifiés à partir d'aujourd'hui. */
  horizonDays?: number;
  /** Jours ajoutés exceptionnellement par le parent (ex. un week-end chargé). */
  extraDates?: readonly IsoDate[];
  /** Congés et absences : aucun travail ces jours-là, même s'ils sont ajoutés exceptionnellement. */
  blockedDates?: readonly IsoDate[];
  /**
   * Semaine chargée : seulement l'essentiel (devoirs, évaluations, leçons pour les 3 prochains jours),
   * avec 60 % du temps quotidien habituel ; le reste est reporté au prochain planning.
   */
  lightWeek?: boolean;
}

export interface WeekPlan {
  days: PlannedDay[];
  alerts: PlanningAlert[];
}

/** Temps de préparation de base, en minutes, pour un élève de fin de primaire. */
const BASE_MINUTES: Record<TaskKind, number> = { devoir: 20, lecon: 15, interro: 45, examen: 120 };

/** Nombre de jours de préparation avant l'échéance. */
const PREPARATION_DAYS: Record<TaskKind, number> = { devoir: 2, lecon: 3, interro: 5, examen: 10 };

function levelFactor(grade: Grade): number {
  const level = schoolLevel(grade);
  const year = gradeYear(grade);
  if (level === 'maternelle') return 0.5;
  if (level === 'primaire') return year <= 2 ? 0.6 : 1;
  return year <= 3 ? 1.3 : 1.6;
}

/** Temps de travail quotidien raisonnable selon l'âge. */
export function defaultDailyCapacity(grade: Grade): number {
  const level = schoolLevel(grade);
  const year = gradeYear(grade);
  if (level === 'maternelle') return 15;
  if (level === 'primaire') return year <= 2 ? 20 : 40;
  return year <= 3 ? 75 : 105;
}

const roundTo5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

export function estimateTaskMinutes(kind: TaskKind, grade: Grade): number {
  return roundTo5(BASE_MINUTES[kind] * levelFactor(grade));
}

/** Semaine chargée : part du temps quotidien habituel, et horizon des leçons gardées. */
const LIGHT_WEEK_FACTOR = 0.6;
const LIGHT_WEEK_LESSON_DAYS = 3;

/** Durée d'un examen blanc : une séance d'entraînement, pas une préparation de plusieurs jours. */
const MOCK_EXAM_MINUTES = 40;

const isEvaluation = (kind: TaskKind) => kind === 'interro' || kind === 'examen';

function activityFor(kind: TaskKind, isLastDay: boolean): Activity {
  if (kind === 'devoir') return 'faire';
  if (kind === 'lecon') return 'etudier';
  return isLastDay ? 'se_tester' : 'reviser';
}

/** Découpe une durée en périodes d'au plus `chunk` minutes, multiples de 5. */
function splitMinutes(total: number, chunk: number): number[] {
  const parts: number[] = [];
  let left = total;
  while (left > 0) {
    const part = Math.min(chunk, left);
    parts.push(part);
    left -= part;
  }
  // Évite une dernière période minuscule : on la fusionne avec la précédente.
  if (parts.length > 1 && parts[parts.length - 1]! < 10) {
    const last = parts.pop()!;
    parts[parts.length - 1]! += last;
  }
  return parts;
}

interface Chunk {
  task: PlannableTask;
  minutes: number;
  /** Jours où ce morceau peut être placé, du plus tôt au plus tard. */
  window: IsoDate[];
  day: IsoDate;
}

export function planWeek(input: PlanningInput): WeekPlan {
  const horizon = input.horizonDays ?? 7;
  const baseCapacity = input.dailyCapacityMinutes ?? defaultDailyCapacity(input.grade);
  const capacity = input.lightWeek ? roundTo5(baseCapacity * LIGHT_WEEK_FACTOR) : baseCapacity;
  let postponed = 0;
  const chunkSize = Math.max(10, input.workMinutes);
  const lastDay = addDays(input.today, horizon - 1);
  const available = new Set(input.availableDays);
  const extra = new Set(input.extraDates ?? []);
  const blocked = new Set(input.blockedDates ?? []);
  const isAvailable = (date: IsoDate) =>
    !blocked.has(date) && (available.has(weekdayKey(date)) || extra.has(date));
  let duringBreak = 0;

  const chunks: Chunk[] = [];
  const tasks = [...input.tasks]
    .filter((t) => daysBetween(input.today, t.dueDate) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || BASE_MINUTES[b.kind] - BASE_MINUTES[a.kind]);

  for (const task of tasks) {
    if (task.mockExam) {
      // Examen blanc : une seule séance « se tester », le jour prévu (sans lissage vers d'autres jours).
      const minutes = roundTo5(MOCK_EXAM_MINUTES * levelFactor(input.grade)) - (task.doneMinutes ?? 0);
      if (minutes > 0 && task.dueDate <= lastDay && blocked.has(task.dueDate)) duringBreak++;
      else if (minutes > 0 && task.dueDate <= lastDay) {
        chunks.push({ task, minutes, window: [task.dueDate], day: task.dueDate });
      }
      continue;
    }
    const remaining = estimateTaskMinutes(task.kind, input.grade) - (task.doneMinutes ?? 0);
    if (remaining <= 0) continue;
    if (
      input.lightWeek &&
      task.kind === 'lecon' &&
      daysBetween(input.today, task.dueDate) > LIGHT_WEEK_LESSON_DAYS
    ) {
      postponed++;
      continue;
    }

    const dueIn = daysBetween(input.today, task.dueDate);
    // Fenêtre de préparation : les jours qui précèdent l'échéance (le jour même si elle est aujourd'hui).
    const allDays: IsoDate[] = [];
    for (
      let offset = Math.max(0, dueIn - PREPARATION_DAYS[task.kind]);
      offset < Math.max(dueIn, 1);
      offset++
    ) {
      allDays.push(addDays(input.today, offset));
    }
    let window = allDays.filter(isAvailable);
    // Aucun jour habituel : le dernier jour hors congé, sinon la tâche est signalée au parent.
    if (window.length === 0) window = allDays.filter((d) => !blocked.has(d)).slice(-1);
    if (window.length === 0) {
      if (allDays.some((d) => d <= lastDay)) duringBreak++;
      continue;
    }

    // Une partie seulement tombe dans l'horizon si l'échéance est lointaine.
    const inHorizon = window.filter((d) => d <= lastDay);
    if (inHorizon.length === 0) continue;
    const share = Math.round((remaining * inHorizon.length) / window.length);
    const parts = splitMinutes(roundTo5(share), chunkSize);

    // Répartition espacée : un morceau par jour, du dernier jour vers le premier.
    parts.forEach((minutes, i) => {
      const day = inHorizon[inHorizon.length - 1 - (i % inHorizon.length)]!;
      chunks.push({ task, minutes, window: inHorizon, day });
    });
  }

  // Lissage : on avance les morceaux des jours surchargés vers des jours plus légers de leur fenêtre.
  const load = (date: IsoDate) => chunks.filter((c) => c.day === date).reduce((sum, c) => sum + c.minutes, 0);
  for (let offset = horizon - 1; offset >= 0; offset--) {
    const date = addDays(input.today, offset);
    const movable = chunks
      .filter((c) => c.day === date)
      .sort((a, b) => b.task.dueDate.localeCompare(a.task.dueDate));
    for (const chunk of movable) {
      if (load(date) <= capacity) break;
      const target = chunk.window
        .filter((d) => d !== date && load(d) + chunk.minutes <= capacity)
        .sort((a, b) => load(a) - load(b) || a.localeCompare(b))[0];
      if (target) chunk.day = target;
    }
  }

  const days: PlannedDay[] = [];
  for (let offset = 0; offset < horizon; offset++) {
    const date = addDays(input.today, offset);
    const dayChunks = chunks.filter((c) => c.day === date);
    if (dayChunks.length === 0) continue;

    // Fusion des morceaux d'une même tâche sur un même jour.
    const items = new Map<string, PlannedItem>();
    for (const chunk of dayChunks) {
      const latest = chunks.filter((c) => c.task.id === chunk.task.id).every((c) => c.day <= date);
      const existing = items.get(chunk.task.id);
      if (existing) existing.minutes += chunk.minutes;
      else
        items.set(chunk.task.id, {
          taskId: chunk.task.id,
          minutes: chunk.minutes,
          activity: chunk.task.mockExam ? 'se_tester' : activityFor(chunk.task.kind, latest),
        });
    }
    const list = [...items.values()];
    days.push({ date, items: list, totalMinutes: list.reduce((sum, i) => sum + i.minutes, 0) });
  }

  const alerts = buildAlerts(days, input, capacity, isAvailable);
  if (duringBreak > 0) alerts.push({ type: 'conge', count: duringBreak });
  if (postponed > 0) alerts.push({ type: 'reporte', count: postponed });
  return { days, alerts };
}

function buildAlerts(
  days: PlannedDay[],
  input: PlanningInput,
  capacity: number,
  isAvailable: (date: IsoDate) => boolean,
): PlanningAlert[] {
  const alerts: PlanningAlert[] = [];

  const overloaded = days.filter((d) => d.totalMinutes > capacity);
  for (const day of overloaded) {
    alerts.push({ type: 'surcharge', date: day.date, overMinutes: day.totalMinutes - capacity });
  }

  // Plusieurs évaluations le même jour.
  const evaluationsByDay = new Map<IsoDate, number>();
  for (const task of input.tasks) {
    if (isEvaluation(task.kind) && !task.mockExam)
      evaluationsByDay.set(task.dueDate, (evaluationsByDay.get(task.dueDate) ?? 0) + 1);
  }
  for (const [date, count] of [...evaluationsByDay].sort(([a], [b]) => a.localeCompare(b))) {
    if (count >= 2 && daysBetween(input.today, date) >= 0)
      alerts.push({ type: 'evaluations_rapprochees', date, count });
  }

  // En cas de surcharge, proposer les jours de week-end non prévus qui tombent avant les échéances concernées.
  if (overloaded.length > 0) {
    const overloadedTaskIds = new Set(overloaded.flatMap((d) => d.items.map((i) => i.taskId)));
    const latestDue = input.tasks
      .filter((t) => overloadedTaskIds.has(t.id))
      .reduce((max, t) => (t.dueDate > max ? t.dueDate : max), input.today);
    const weekend: IsoDate[] = [];
    for (let offset = 0; offset < (input.horizonDays ?? 7); offset++) {
      const date = addDays(input.today, offset);
      const key = weekdayKey(date);
      const blocked = input.blockedDates?.includes(date) ?? false;
      if ((key === 'sam' || key === 'dim') && !isAvailable(date) && !blocked && date < latestDue)
        weekend.push(date);
    }
    if (weekend.length > 0) alerts.push({ type: 'week_end_conseille', dates: weekend });
  }

  return alerts;
}
