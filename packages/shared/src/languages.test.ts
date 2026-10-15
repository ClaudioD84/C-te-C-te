import { describe, expect, it } from 'vitest';

import { foreignLanguage, languageName, listeningRound } from './languages';
import { seededRng } from './relax';

const card = (id: string, front: string, back: string, subject = 'Néerlandais') => ({
  id,
  front,
  back,
  subject,
});

describe('cartes de langues', () => {
  it('reconnaît la langue de la matière', () => {
    expect(foreignLanguage('Néerlandais')).toBe('nl-BE');
    expect(foreignLanguage('Langue moderne 1 : anglais')).toBe('en-GB');
    expect(foreignLanguage('Mathématiques')).toBeNull();
    expect(languageName('Allemand')).toBe('allemand');
  });

  it('écoute et choisis : 4 sens différents de la même langue, dont le bon', () => {
    const cards = [
      card('1', 'le chien', 'de hond'),
      card('2', 'le chat', 'de kat'),
      card('3', 'la maison', 'het huis'),
      card('4', 'le livre', 'het boek'),
      card('5', 'la pomme', 'the apple', 'Anglais'),
      card('6', '2 + 2', '4', 'Mathématiques'),
    ];
    const round = listeningRound(cards, seededRng('x'));
    expect(round.map((q) => q.card.subject)).not.toContain('Mathématiques');
    // Une seule carte d'anglais : pas assez de choix, elle n'est pas posée.
    expect(round.map((q) => q.card.id).sort()).toEqual(['1', '2', '3', '4']);
    for (const q of round) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.card.front);
      expect(q.options).not.toContain('la pomme');
    }
  });
});
