import { z } from 'zod';

/**
 * Paquet d'étude généré pour une tâche (F4, étape 2) : fiche de synthèse, quiz,
 * exercices et cartes de révision. Le même format sert à l'écran et à l'export PDF.
 */

export const ficheSchema = z.object({
  title: z.string().min(1),
  sections: z.array(z.object({ heading: z.string().min(1), points: z.array(z.string().min(1)).min(1) })),
  keyTerms: z.array(z.object({ term: z.string().min(1), definition: z.string().min(1) })),
});

export const quizQuestionSchema = z
  .object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(4),
    answerIndex: z.number().int().min(0),
    explanation: z.string().min(1),
  })
  .refine((q) => q.answerIndex < q.choices.length, {
    message: 'Réponse hors des choix',
    path: ['answerIndex'],
  });

export const exerciseSchema = z.object({
  instruction: z.string().min(1),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  hint: z.string().min(1).nullable(),
});

export const flashcardContentSchema = z.object({ front: z.string().min(1), back: z.string().min(1) });

export const studyPackSchema = z.object({
  /** Vrai si la tâche est trop vague pour savoir quoi réviser : le contenu est alors vide. */
  topicUnclear: z.boolean(),
  fiche: ficheSchema.nullable(),
  quiz: z.array(quizQuestionSchema),
  exercises: z.array(exerciseSchema),
  flashcards: z.array(flashcardContentSchema),
});
export type StudyPack = z.infer<typeof studyPackSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
