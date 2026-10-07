import { describe, expect, it } from 'vitest';

import {
  buildSudoku,
  buildWordSearch,
  isSudokuSolved,
  isTaquinSolved,
  mandala,
  memoryDeck,
  moveTile,
  gridWord,
  relaxGamesFor,
  relaxMinutesLimit,
  seededRng,
  shuffledTaquin,
  solvedTaquin,
  SUDOKU_SETUP,
  wordBetween,
} from './relax';

describe('coin détente', () => {
  it('propose les jeux de son âge et 10 minutes par défaut', () => {
    expect(relaxGamesFor('M2')).not.toContain('mots_meles');
    expect(relaxGamesFor('M2')).not.toContain('taquin');
    expect(relaxGamesFor('P1')).toContain('taquin');
    expect(relaxGamesFor('P5')).toContain('mots_meles');
    expect(relaxMinutesLimit({})).toBe(10);
    expect(relaxMinutesLimit({ relaxMinutes: 0 })).toBe(0);
  });

  it('memory : des paires, avec les centres d’intérêt d’abord', () => {
    const deck = memoryDeck('P1', ['espace'], seededRng('a'));
    expect(deck).toHaveLength(12);
    const counts = new Map<string, number>();
    for (const card of deck) counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    expect(memoryDeck('S3', [], seededRng('b'))).toHaveLength(20);
  });

  it('taquin : toujours mélangé et soluble, on ne glisse qu’une pièce voisine', () => {
    for (const seed of ['a', 'b', 'c']) {
      const board = shuffledTaquin(3, 16, seededRng(seed));
      expect(isTaquinSolved(board)).toBe(false);
      expect([...board].sort()).toEqual([...solvedTaquin(3)].sort());
    }
    const solved = solvedTaquin(3);
    expect(moveTile(solved, 3, 0)).toBeNull();
    const moved = moveTile(solved, 3, 7)!;
    expect(moved[8]).toBe(8);
    expect(isTaquinSolved(moveTile(moved, 3, 8)!)).toBe(true);
  });

  it('mots mêlés : les mots de la dictée sans accents, retrouvés par leurs extrémités', () => {
    expect(gridWord('Élève')).toBe('ELEVE');
    expect(gridWord('cœur')).toBe('COEUR');
    const search = buildWordSearch('P4', ['château', 'forêt', 'école', 'a'], seededRng('x'));
    expect(search.words.map((w) => w.word)).toEqual(expect.arrayContaining(['CHATEAU', 'FORET', 'ECOLE']));
    for (const w of search.words) {
      expect(w.cells.map(([r, c]) => search.grid[r]![c]).join('')).toBe(w.word);
      expect(wordBetween(search, w.cells.at(-1)!, w.cells[0]!)).toBe(w);
    }
    expect(wordBetween(search, [0, 0], [0, 0])).toBeNull();
  });

  it('sudoku : grille conforme une fois remplie, vérifiée par les règles', () => {
    for (const age of ['petit', 'grand'] as const) {
      const setup = SUDOKU_SETUP[age];
      const grid = buildSudoku(setup, seededRng(age));
      expect(grid.flat().filter((v) => v > 0)).toHaveLength(setup.clues);
      expect(isSudokuSolved(grid, setup)).toBe(false);
    }
    const setup = SUDOKU_SETUP.moyen;
    const full = buildSudoku({ ...setup, clues: 16 }, seededRng('z'));
    expect(isSudokuSolved(full, setup)).toBe(true);
    const wrong = full.map((row) => [...row]);
    [wrong[0]![0], wrong[0]![1]] = [wrong[0]![1]!, wrong[0]![0]!];
    expect(isSudokuSolved(wrong, setup)).toBe(false);
    expect(
      isSudokuSolved(buildSudoku({ ...SUDOKU_SETUP.grand, clues: 36 }, seededRng('g')), SUDOKU_SETUP.grand),
    ).toBe(true);
  });

  it('coloriage : mandala symétrique, peu de zones pour les petits', () => {
    const small = mandala('M1', 0);
    expect(small.size).toBe(8);
    const zones = new Set(small.zones.flat());
    expect(zones.size).toBeLessThanOrEqual(small.zoneCount);
    expect(small.zoneCount).toBeLessThanOrEqual(5);
    const big = mandala('P6', 1);
    for (let r = 0; r < big.size; r++)
      for (let c = 0; c < big.size; c++) {
        expect(big.zones[r]![c]).toBe(big.zones[big.size - 1 - r]![c]);
        expect(big.zones[r]![c]).toBe(big.zones[c]![r]);
      }
  });
});
