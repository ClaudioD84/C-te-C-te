import { describe, expect, it } from 'vitest';

import { datesInRanges } from './days-off';

describe('datesInRanges', () => {
  it('jours couverts, sans doublon, limités à la période demandée', () => {
    expect(
      datesInRanges(
        [
          { start: '2026-10-01', end: '2026-10-06' },
          { start: '2026-10-06', end: '2026-10-07' },
          { start: '2026-11-01', end: '2026-11-02' },
        ],
        '2026-10-05',
        '2026-10-11',
      ),
    ).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });
});
