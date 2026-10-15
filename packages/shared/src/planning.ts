import { addDays, daysBetween, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';
import { gradeYear, schoolLevel, type Grade } from './school';
import type { TaskKind } from './task';

/**
 * Planning hebdomadaire et régulation de la charge (F4, F8).
 * Algorithme déterministe : il répartit le temps de préparation de chaque tâche
 * sur les jours disponibles avant l'échéance, puis lisse les jours trop chargés.
 */

/** Priorité donnée par le parent : prioritaire (commencée au plus tôt), normale, ou qui peut attendre. */
export const TASK_PRIORITIES = ['haute', 'normale', 'basse'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  haute: 'Prioritaire',
  normale: 'Normale',
  basse: 'Peut attendre',
};

/**
 * Répartition du travail : « reguliere » remplit d'abord les jours les plus libres, dès aujourd'hui ;
 * « echeance » place chaque tâche dans les jours qui précèdent juste son échéance.
 */
export const PLANNING_STRATEGIES = ['reguliere', 'echeance'] as const;
export type PlanningStrategy = (typeof PLANNING_STRATEGIES)[number];
export const PLANNING_STRATEGY_LABELS: Record<PlanningStrategy, string> = {
  reguliere: 'Régulièrement, dès aujourd’hui',
  echeance: 'Juste avant l’échéance',
};

export interface PlannableTask {
  id: string;
  subject: string;
  kind: TaskKind;
  dueDate: IsoDate;
  /** Minutes déjà travaillées sur cette tâche lors de sessions précédentes. */
  doneMinutes?: number;
  /** Examen blanc d'un dossier de révision (F5) : passé en une fois, le jour prévu. */
  mockExam?: boolean;
  /** « normale » si absente. */
  priority?: TaskPriority;
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
  /** « echeance » si absente. Une tâche prioritaire commence toujours au plus tôt, une autre qui peut attendre
   * se fait toujours près de son échéance. */
  strategy?: PlanningStrategy;
}

export interface WeekPlan {
  days: PlannedDay[];
  alerts: PlanningAlert[];
}

/** Temps de préparation de base, en minutes, pour un élève de fin de primaire. */
const BASE_MINUTES: Record<TaskKind, number> = { devoir: 20, lecon: 15, interro: 45, examen: 120 };

/** Nombre de jours de préparation avant l'échéance. */
const PREPARATION_DAYS: Record<TaskKind, number> = { devoir: 2, lecon: 3, interro: 5, examen: 10 };
/** Répartition régulière ou tâche prioritaire : fenêtre plus large, jusqu'à aujourd'hui. */
const SPREAD_DAYS: Record<TaskKind, number> = { devoir: 7, lecon: 7, interro: 7, examen: 14 };

const PRIORITY_RANK: Record<TaskPriority, number> = { haute: 0, normale: 1, basse: 2 };
const priorityOf = (task: PlannableTask): TaskPriority => task.priority ?? 'normale';

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

/** Où placer les morceaux d'une tâche : au plus tôt, sur les jours libres, ou juste avant l'échéance. */
type Placement = 'tot' | 'reguliere' | 'echeance';

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
  // Morceaux à poser sur les jours les plus libres, une fois les autres placés.
  const toSpread: { task: PlannableTask; parts: number[]; window: IsoDate[] }[] = [];
  const placementOf = (task: PlannableTask): Placement => {
    const priority = priorityOf(task);
    if (priority === 'haute') return 'tot';
    if (priority === 'basse') return 'echeance';
    return input.strategy ?? 'echeance';
  };
  const tasks = [...input.tasks]
    .filter((t) => daysBetween(input.today, t.dueDate) >= 0)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        PRIORITY_RANK[priorityOf(a)] - PRIORITY_RANK[priorityOf(b)] ||
        BASE_MINUTES[b.kind] - BASE_MINUTES[a.kind],
    );

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
    // Semaine chargée : les leçons lointaines et ce qui peut attendre sont reportés, jamais une priorité.
    if (
      input.lightWeek &&
      priorityOf(task) !== 'haute' &&
      (task.kind === 'lecon' || priorityOf(task) === 'basse') &&
      daysBetween(input.today, task.dueDate) > LIGHT_WEEK_LESSON_DAYS
    ) {
      postponed++;
      continue;
    }

    const placement = placementOf(task);
    const dueIn = daysBetween(input.today, task.dueDate);
    const preparation = placement === 'echeance' ? PREPARATION_DAYS[task.kind] : SPREAD_DAYS[task.kind];
    // Fenêtre de préparation : les jours qui précèdent l'échéance (le jour même si elle est aujourd'hui).
    const allDays: IsoDate[] = [];
    for (let offset = Math.max(0, dueIn - preparation); offset < Math.max(dueIn, 1); offset++) {
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

    if (placement === 'reguliere') {
      toSpread.push({ task, parts, window: inHorizon });
      continue;
    }
    // Un morceau par jour : du premier jour vers le dernier (au plus tôt), ou du dernier vers le premier.
    parts.forEach((minutes, i) => {
      const index =
        placement === 'tot' ? i % inHorizon.length : inHorizon.length - 1 - (i % inHorizon.length);
      chunks.push({ task, minutes, window: inHorizon, day: inHorizon[index]! });
    });
  }

  // Répartition régulière : chaque morceau va sur le jour le plus libre de sa fenêtre, un jour différent pour
  // chaque morceau d'une même tâche si possible. À charge égale, un devoir ou une leçon se fait au plus tôt ;
  // une évaluation se révise au plus près du test.
  const dayLoad = (date: IsoDate) =>
    chunks.filter((c) => c.day === date).reduce((sum, c) => sum + c.minutes, 0);
  for (const { task, parts, window } of toSpread) {
    const latestFirst = isEvaluation(task.kind);
    for (const minutes of parts) {
      const used = new Set(chunks.filter((c) => c.task.id === task.id).map((c) => c.day));
      const day = [...window].sort(
        (a, b) =>
          Number(used.has(a)) - Number(used.has(b)) ||
          dayLoad(a) - dayLoad(b) ||
          (latestFirst ? b.localeCompare(a) : a.localeCompare(b)),
      )[0]!;
      chunks.push({ task, minutes, window, day });
    }
  }

  // Lissage : on avance les morceaux des jours surchargés vers des jours plus légers de leur fenêtre.
  const load = (date: IsoDate) => chunks.filter((c) => c.day === date).reduce((sum, c) => sum + c.minutes, 0);
  for (let offset = horizon - 1; offset >= 0; offset--) {
    const date = addDays(input.today, offset);
    // Ce qui peut attendre bouge en premier, une priorité en dernier.
    const movable = chunks
      .filter((c) => c.day === date)
      .sort(
        (a, b) =>
          PRIORITY_RANK[priorityOf(b.task)] - PRIORITY_RANK[priorityOf(a.task)] ||
          b.task.dueDate.localeCompare(a.task.dueDate),
      );
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
