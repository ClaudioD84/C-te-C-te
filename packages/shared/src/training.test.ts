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
  steps: [],
  hint: null,
};
const open = {
  instruction: 'Écris.',
  prompt: 'Une phrase avec « fleuve ».',
  accepted: [],
  answer: 'La Meuse est un fleuve.',
  steps: [],
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

  it('remédiation : exercices guidés avant les exercices en autonomie', () => {
    const guided = { ...short, prompt: 'Guidé', steps: ['Trouve le sujet.'] };
    const items = trainingItems({ quiz: [], exercises: [short, open, guided] });
    expect(items.map((i) => (i.kind === 'choix' ? i.kind : `${i.kind}:${i.exercise.prompt}`))).toEqual([
      'saisie:Guidé',
      'saisie:Namur : Meuse et …',
      'libre:Une phrase avec « fleuve ».',
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

describe('explications neutres', () => {
  it('retire les félicitations en tête, pas le contenu', async () => {
    const { neutralFeedback } = await import('./training');
    expect(neutralFeedback('Bravo ! 600 + 400 = 1000.')).toBe('600 + 400 = 1000.');
    expect(neutralFeedback('Exact : Liège est construite sur la Meuse.')).toBe(
      'Liège est construite sur la Meuse.',
    );
    expect(neutralFeedback('Bravo, tu as trouvé ! Super ! il faut 400.')).toBe('Il faut 400.');
    expect(neutralFeedback('Oui, car six cents plus quatre cents font mille.')).toBe(
      'Oui, car six cents plus quatre cents font mille.',
    );
    expect(neutralFeedback('Liège est construite sur la Meuse.')).toBe('Liège est construite sur la Meuse.');
    // Jamais vide : une explication faite seulement de félicitations reste telle quelle.
    expect(neutralFeedback('Bravo !')).toBe('Bravo !');
  });
});
