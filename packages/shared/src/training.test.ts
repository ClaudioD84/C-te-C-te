import { describe, expect, it } from 'vitest';

import { isAnswered, trainingItems, verifyAnswer } from './training';

const question = {
  question: 'Quel fleuve ?',
  choices: ['La Meuse', "L'Escaut"],
  answerIndex: 0,
  explanation: '…',
};
const short = {
  instruction: 'Complète.',
  prompt: 'Namur : Meuse et …',
  accepted: ['Sambre'],
  answer: 'Sambre',
  hint: null,
};
const open = {
  instruction: 'Écris.',
  prompt: 'Une phrase avec « fleuve ».',
  accepted: [],
  answer: 'La Meuse est un fleuve.',
  hint: null,
};

describe('entraînement en trois étapes', () => {
  it('du plus simple au plus exigeant : choix, réponse courte, réponse libre', () => {
    expect(trainingItems({ quiz: [question], exercises: [open, short] }).map((i) => i.kind)).toEqual([
      'choix',
      'saisie',
      'libre',
    ]);
  });

  it('« je ne sais pas » et « fait sur papier » comptent comme une réponse', () => {
    const [choice, typed, free] = trainingItems({ quiz: [question], exercises: [short, open] });
    expect(isAnswered(choice!, undefined)).toBe(false);
    expect(isAnswered(choice!, { choice: 1 })).toBe(true);
    expect(isAnswered(typed!, { text: '' })).toBe(true);
    expect(isAnswered(typed!, { choice: 0 })).toBe(false);
    expect(isAnswered(free!, { paper: true })).toBe(true);
  });

  it('vérification contre la réponse attendue', () => {
    const [choice, typed, free] = trainingItems({ quiz: [question], exercises: [short, open] });
    expect(verifyAnswer(choice!, { choice: 0 })).toEqual({ result: 'juste' });
    expect(verifyAnswer(choice!, { choice: 1 })).toEqual({ result: 'faux' });
    expect(verifyAnswer(typed!, { text: 'la sambre' })).toEqual({ result: 'juste' });
    expect(verifyAnswer(typed!, { text: '' })).toEqual({ result: 'faux' });
    expect(verifyAnswer(free!, { text: 'La Meuse coule.' })).toBeNull();
  });
});
