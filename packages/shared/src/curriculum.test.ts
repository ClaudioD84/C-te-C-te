import { describe, expect, it } from 'vitest';

import { curriculumFileSchema, sortParentsFirst, type CurriculumEntry } from './curriculum';

// Données de test fictives : ne reprennent pas un référentiel officiel.
const entries: CurriculumEntry[] = [
  { code: 'T-1-1', parentCode: 'T-1', kind: 'attendu', subject: 'Test', grades: ['P3'], label: 'Attendu' },
  {
    code: 'T-1',
    parentCode: 'T',
    kind: 'competence',
    subject: 'Test',
    grades: ['P3', 'P4'],
    label: 'Compétence',
  },
  { code: 'T', parentCode: null, kind: 'domaine', subject: 'Test', grades: [], label: 'Domaine' },
];
const file = { source: { title: 'Test', url: null, version: '2026' }, level: 'primaire', entries };

describe('référentiels', () => {
  it('accepte un fichier cohérent', () => {
    expect(curriculumFileSchema.safeParse(file).success).toBe(true);
  });

  it('refuse un parent manquant ou un code en double', () => {
    const orphan = { ...file, entries: [...entries, { ...entries[0]!, code: 'X', parentCode: 'ABSENT' }] };
    expect(curriculumFileSchema.safeParse(orphan).success).toBe(false);
    const duplicate = { ...file, entries: [...entries, entries[0]!] };
    expect(curriculumFileSchema.safeParse(duplicate).success).toBe(false);
  });

  it('refuse une compétence sans parent', () => {
    const rootless = { ...file, entries: [{ ...entries[1]!, parentCode: null }] };
    expect(curriculumFileSchema.safeParse(rootless).success).toBe(false);
  });

  it('place les parents avant leurs enfants', () => {
    expect(sortParentsFirst(entries).map((e) => e.code)).toEqual(['T', 'T-1', 'T-1-1']);
  });
});
