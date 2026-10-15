import { describe, expect, it } from 'vitest';

import { cardAnswers, checkAnswer, parseNumber } from './answer-check';

const verdict = (accepted: string[], typed: string) => checkAnswer(accepted, typed);

describe('vérification des réponses', () => {
  it('ignore majuscules, espaces, ponctuation finale et article français', () => {
    expect(verdict(['Sambre'], '  sambre. ')).toEqual({ result: 'juste' });
    expect(verdict(['La Meuse'], 'meuse')).toEqual({ result: 'juste' });
    expect(verdict(["L'Escaut"], 'l’ Escaut')).toEqual({ result: 'juste' });
    expect(verdict(['Meuse'], 'la Meuse')).toEqual({ result: 'juste' });
  });

  it('une réponse vide ou fausse est fausse', () => {
    expect(verdict(['Sambre'], '')).toEqual({ result: 'faux' });
    expect(verdict(['Sambre'], 'Escaut')).toEqual({ result: 'faux' });
    expect(verdict([], 'Sambre')).toEqual({ result: 'faux' });
  });

  it('presque : accents, article de la langue étudiée, petite faute', () => {
    expect(verdict(['été'], 'ete')).toEqual({ result: 'presque', nearMiss: 'accents' });
    expect(verdict(['het huis'], 'de huis')).toEqual({ result: 'presque', nearMiss: 'article' });
    expect(verdict(['de hond'], 'hond')).toEqual({ result: 'presque', nearMiss: 'article' });
    expect(verdict(['der Hund'], 'der hund')).toEqual({ result: 'juste' });
    expect(verdict(['Bruxelles'], 'Bruxeles')).toEqual({ result: 'presque', nearMiss: 'orthographe' });
    // Mots courts : une lettre change tout (mer / mur).
    expect(verdict(['mer'], 'mur')).toEqual({ result: 'faux' });
  });

  it('nombres écrits à la belge, unités', () => {
    expect(verdict(['3,5'], '3.5')).toEqual({ result: 'juste' });
    expect(verdict(['1 000'], '1000')).toEqual({ result: 'juste' });
    expect(verdict(['1.000'], '1 000')).toEqual({ result: 'juste' });
    expect(verdict(['12 cm'], '12cm')).toEqual({ result: 'juste' });
    expect(verdict(['12 cm'], '12')).toEqual({ result: 'presque', nearMiss: 'unite' });
    expect(verdict(['12'], '12 cm')).toEqual({ result: 'juste' });
    expect(verdict(['12,50 €'], '12,5 euros')).toEqual({ result: 'juste' });
    expect(verdict(['12'], '13')).toEqual({ result: 'faux' });
    expect(verdict(['8', 'huit'], 'huit')).toEqual({ result: 'juste' });
    expect(verdict(['8'], 'huit')).toEqual({ result: 'faux' });
  });

  it('une fraction s’écrit sous la forme demandée', () => {
    expect(verdict(['1/2'], '1 / 2')).toEqual({ result: 'juste' });
    expect(verdict(['1/2'], '2/4')).toEqual({ result: 'faux' });
    expect(verdict(['1/2'], '0,5')).toEqual({ result: 'faux' });
  });

  it('lit les nombres sans prendre une date pour un nombre', () => {
    expect(parseNumber('3/4')).toEqual({ value: 0.75, unit: '', fraction: true });
    expect(parseNumber('50 km/h')).toEqual({ value: 50, unit: 'km/h', fraction: false });
    expect(parseNumber('21 juillet 1831')).toBeNull();
    expect(parseNumber('Sambre')).toBeNull();
  });

  it('cartes : réponse courte vérifiable, sinon comparaison par l’enfant', () => {
    expect(cardAnswers('La Meuse')).toEqual(['La Meuse']);
    expect(cardAnswers('de fiets / het rijwiel')).toEqual(['de fiets', 'het rijwiel']);
    expect(cardAnswers('3/4')).toEqual(['3/4']);
    expect(cardAnswers('Dans la mer du Nord')).toBeNull();
    expect(cardAnswers("Cours d'eau qui se jette dans la mer.")).toBeNull();
  });
});
