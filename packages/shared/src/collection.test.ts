import { describe, expect, it } from 'vitest';

import { BELGIAN_ANIMALS, collectionProgress } from './collection';

describe('album des animaux', () => {
  it('un animal tous les 25 points, album borné', () => {
    expect(collectionProgress(0)).toEqual({ unlocked: 0, total: BELGIAN_ANIMALS.length, pointsToNext: 25 });
    expect(collectionProgress(60)).toMatchObject({ unlocked: 2, pointsToNext: 15 });
    expect(collectionProgress(10_000)).toMatchObject({ unlocked: BELGIAN_ANIMALS.length, pointsToNext: 0 });
  });
});
