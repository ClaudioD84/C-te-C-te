import { describe, expect, it } from 'vitest';

import { deriveLearningSettings } from './learning-settings';
import { buildPackHtml } from './print';
import type { StudyPack } from './study-pack';

const pack: StudyPack = {
  topicUnclear: false,
  fiche: {
    title: 'Les <fleuves>',
    sections: [{ heading: 'La Meuse', points: ['Traverse Liège'] }],
    keyTerms: [],
  },
  quiz: [
    {
      question: 'Quel fleuve ?',
      choices: ['La Meuse', "L'Escaut"],
      answerIndex: 0,
      explanation: 'Liège est sur la Meuse.',
    },
  ],
  exercises: [{ instruction: 'Complète.', prompt: 'Namur : Meuse et …', answer: 'Sambre', hint: null }],
  flashcards: [],
};
const meta = { subject: 'Éveil', description: 'Revoir les fleuves', dueLabel: 'jeudi 8 oct.' };
const preferences = { availableDays: ['lun' as const], prefersPaper: true };
const options = { fontFaceCss: '@font-face{}', fontFamilyName: 'Lexend' };

describe('export PDF', () => {
  it('utilise Lexend et des espacements larges pour un profil dyslexie', () => {
    const html = buildPackHtml(
      pack,
      deriveLearningSettings({ grade: 'P5', needs: ['dyslexie'], preferences }),
      meta,
      options,
    );
    expect(html).toContain("font-family: 'Lexend'");
    expect(html).toContain('line-height: 1.8');
    expect(html).toContain('letter-spacing: 0.12em');
  });

  it('garde une police standard sans besoin particulier', () => {
    const html = buildPackHtml(
      pack,
      deriveLearningSettings({ grade: 'S2', needs: [], preferences }),
      meta,
      options,
    );
    expect(html).toContain('font-family: Verdana');
  });

  it('échappe le contenu et place les réponses sur une page séparée', () => {
    const html = buildPackHtml(
      pack,
      deriveLearningSettings({ grade: 'P5', needs: [], preferences }),
      meta,
      options,
    );
    expect(html).toContain('Les &lt;fleuves&gt;');
    const answers = html.indexOf('<h2>Réponses</h2>');
    expect(answers).toBeGreaterThan(html.indexOf('Quel fleuve ?'));
    expect(html.slice(answers)).toContain('Sambre');
    expect(html.slice(0, answers)).not.toContain('Sambre');
  });
});
