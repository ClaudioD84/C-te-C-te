import { describe, expect, it } from 'vitest';

import { deriveLearningSettings } from './learning-settings';
import { buildPackHtml, buildPacksHtml } from './print';
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

  it('réunit plusieurs fiches dans un document, chacune sur une nouvelle page', () => {
    const settings = deriveLearningSettings({ grade: 'P5', needs: [], preferences });
    const html = buildPacksHtml(
      [
        { pack, meta },
        {
          pack: { ...pack, fiche: { ...pack.fiche!, title: 'Les fractions' } },
          meta: { ...meta, subject: 'Mathématiques' },
        },
      ],
      settings,
      options,
    );
    expect(html.match(/<!doctype html>/g)).toHaveLength(1);
    expect(html).toContain('Les &lt;fleuves&gt;');
    expect(html).toContain('Les fractions');
    expect(html).toContain('<div class="new-page"></div>');
    // Les réponses de chaque fiche restent à la fin de sa fiche.
    expect(html.match(/<h2>Réponses<\/h2>/g)).toHaveLength(2);
  });
});
