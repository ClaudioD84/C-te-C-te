import { describe, expect, it } from 'vitest';

import { studyPackSchema } from './study-pack';

const pack = {
  topicUnclear: false,
  fiche: {
    title: 'Les fleuves',
    sections: [{ heading: 'La Meuse', points: ['Traverse la Wallonie'] }],
    keyTerms: [],
  },
  quiz: [
    {
      question: 'Quel fleuve traverse Liège ?',
      choices: ['La Meuse', "L'Escaut"],
      answerIndex: 0,
      explanation: 'Liège est sur la Meuse.',
    },
  ],
  exercises: [],
  flashcards: [{ front: 'Fleuve de Liège', back: 'La Meuse' }],
};

describe("paquet d'étude", () => {
  it('accepte un paquet valide', () => {
    expect(studyPackSchema.safeParse(pack).success).toBe(true);
  });

  it('refuse une bonne réponse hors des choix', () => {
    const bad = { ...pack, quiz: [{ ...pack.quiz[0]!, answerIndex: 2 }] };
    expect(studyPackSchema.safeParse(bad).success).toBe(false);
  });
});
