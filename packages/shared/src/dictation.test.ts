import { describe, expect, it } from 'vitest';

import { checkSpelling, dictationWords, speechLanguage } from './dictation';

describe('écoute et écris', () => {
  it('ne garde que des mots courts, sans chiffres, et rien en mathématiques', () => {
    const terms = [
      { term: 'la Meuse' },
      { term: 'affluent' },
      { term: 'une très longue expression de plusieurs mots' },
      { term: '1830' },
      { term: 'H2O' },
      { term: 'affluent' },
    ];
    expect(dictationWords('Éveil', terms)).toEqual(['la Meuse', 'affluent']);
    expect(dictationWords('Mathématiques', terms)).toEqual([]);
  });

  it('majuscules et espaces ignorés, accents signalés à part', () => {
    expect(checkSpelling('la Meuse', '  La  meuse ')).toBe('juste');
    expect(checkSpelling('élève', 'eleve')).toBe('accents');
    expect(checkSpelling('aujourd’hui', "aujourd'hui")).toBe('juste');
    expect(checkSpelling('affluent', 'afluent')).toBe('a_revoir');
  });

  it('voix de la langue étudiée', () => {
    expect(speechLanguage('Néerlandais')).toBe('nl-BE');
    expect(speechLanguage('Langue moderne : anglais')).toBe('en-GB');
    expect(speechLanguage('Éveil')).toBe('fr-BE');
  });
});
