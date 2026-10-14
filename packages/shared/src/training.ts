import { checkAnswer, type AnswerVerdict } from './answer-check';
import type { Exercise, QuizQuestion, StudyPack } from './study-pack';

/**
 * Entraînement d'une leçon en trois étapes : je revois (fiche et clés pour réussir), je m'entraîne (l'enfant
 * répond à tout, sans correction), je vérifie (chaque réponse comparée à la réponse attendue).
 */
export type TrainingItem =
  | { kind: 'choix'; question: QuizQuestion }
  | { kind: 'saisie'; exercise: Exercise }
  | { kind: 'libre'; exercise: Exercise };

/** Réponse de l'enfant : un choix, un texte (vide : « je ne sais pas »), ou un exercice fait sur papier. */
export type TrainingAnswer = { choice: number } | { text: string } | { paper: true };

/** Questions de la plus simple à la plus exigeante : choix multiples, réponse courte, réponse libre. */
export function trainingItems(pack: Pick<StudyPack, 'quiz' | 'exercises'>): TrainingItem[] {
  return [
    ...pack.quiz.map((question) => ({ kind: 'choix' as const, question })),
    ...pack.exercises
      .filter((exercise) => exercise.accepted.length > 0)
      .map((exercise) => ({ kind: 'saisie' as const, exercise })),
    ...pack.exercises
      .filter((exercise) => exercise.accepted.length === 0)
      .map((exercise) => ({ kind: 'libre' as const, exercise })),
  ];
}

/** L'enfant a répondu (un « je ne sais pas » compte : il le revoit à la vérification). */
export function isAnswered(item: TrainingItem, answer: TrainingAnswer | undefined): boolean {
  if (!answer) return false;
  if (item.kind === 'choix') return 'choice' in answer;
  return 'text' in answer || 'paper' in answer;
}

/**
 * Verdict de la vérification : par l'application pour un choix ou une réponse courte, null pour une réponse
 * libre (l'enfant compare lui-même avec la correction).
 */
export function verifyAnswer(item: TrainingItem, answer: TrainingAnswer | undefined): AnswerVerdict | null {
  if (item.kind === 'libre') return null;
  if (item.kind === 'choix')
    return {
      result: answer && 'choice' in answer && answer.choice === item.question.answerIndex ? 'juste' : 'faux',
    };
  return checkAnswer(item.exercise.accepted, answer && 'text' in answer ? answer.text : '');
}

/**
 * Félicitations en tête d'une explication ou d'une correction (« Bravo ! », « Exact : ») : l'explication
 * s'affiche aussi quand l'enfant s'est trompé, et le verdict est donné à part. Elles sont retirées, aussi pour
 * les paquets déjà préparés.
 */
const PRAISE =
  /^\s*(?:bravo|super|génial|parfait|excellent|exact(?:ement)?|correct|oui|bien joué|bien vu|très bien|félicitations|bonne réponse|tu as raison|c['’]est (?:juste|ça|exact|correct|bien))(?:[\s,]+[\p{L}'’-]+){0,4}\s*[.!:…]+\s*/iu;

export function neutralFeedback(text: string): string {
  let rest = text;
  for (let match = PRAISE.exec(rest); match && match[0].length < rest.length; match = PRAISE.exec(rest))
    rest = rest.slice(match[0].length);
  return rest === text ? text : rest.charAt(0).toLocaleUpperCase('fr') + rest.slice(1);
}
