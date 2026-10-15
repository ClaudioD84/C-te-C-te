import type { QuizQuestion } from './study-pack';

/**
 * « Ce soir à table » : quelques questions des quiz de ce que l'enfant a travaillé aujourd'hui, pour en
 * parler en famille (se rappeler aide à mémoriser). Une par matière d'abord, choix stable dans la journée.
 */
export interface TableQuestion {
  subject: string;
  question: string;
  answer: string;
}

export const TABLE_QUESTION_COUNT = 3;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function tableQuestions(
  packs: readonly { subject: string; quiz: readonly QuizQuestion[] }[],
  seed: string,
): TableQuestion[] {
  const pools = packs
    .filter((p) => p.quiz.length > 0)
    .map((p) => ({
      subject: p.subject,
      questions: [...p.quiz].sort((a, b) => hash(seed + a.question) - hash(seed + b.question)),
    }));
  const result: TableQuestion[] = [];
  for (let round = 0; result.length < TABLE_QUESTION_COUNT; round++) {
    const before = result.length;
    for (const pool of pools) {
      const q = pool.questions[round];
      if (q && result.length < TABLE_QUESTION_COUNT)
        result.push({ subject: pool.subject, question: q.question, answer: q.choices[q.answerIndex]! });
    }
    if (result.length === before) break;
  }
  return result;
}
