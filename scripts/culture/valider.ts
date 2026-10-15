/**
 * Reporte les lignes relues de scripts/culture/a-relire.csv dans scripts/culture/contenus.json.
 * Une ligne est reprise si la colonne « garder » vaut oui / x et si « verifie_le » est renseignée
 * (AAAA-MM-JJ ou JJ/MM/AAAA). Les entrées existantes de même code sont remplacées.
 *
 *   deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/culture/valider.ts
 */
import { cultureFileSchema, culturalResourceSchema, type CulturalResource } from '../../packages/shared/src/culture.ts';

const INPUT = new URL('./a-relire.csv', import.meta.url);
const OUTPUT = new URL('./contenus.json', import.meta.url);

/** Découpe un CSV à séparateur « ; » (guillemets doublés à la manière d'Excel). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ';') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const list = (value: string) =>
  value
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);

function isoDate(value: string): string {
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  return fr ? `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}` : value;
}

export function toResources(rows: Record<string, string>[]) {
  const kept: CulturalResource[] = [];
  const problems: string[] = [];
  for (const row of rows) {
    if (!/^(oui|x|o|yes)$/i.test(row.garder ?? '')) continue;
    const result = culturalResourceSchema.safeParse({
      code: row.code,
      kind: row.type,
      title: row.titre,
      description: row.description,
      url: row.lien || null,
      place: row.lieu || null,
      subjects: list(row.matieres),
      grades: list(row.annees),
      verifiedOn: isoDate(row.verifie_le ?? ''),
    });
    if (result.success) kept.push(result.data);
    else problems.push(`${row.code} : ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')}`);
  }
  return { kept, problems };
}

if (import.meta.main) {
  const { kept, problems } = toResources(parseCsv(Deno.readTextFileSync(INPUT)));
  if (problems.length > 0) {
    console.error(`Lignes à corriger (rien n'a été écrit) :\n${problems.join('\n')}`);
    Deno.exit(1);
  }
  const existing = cultureFileSchema.parse(JSON.parse(Deno.readTextFileSync(OUTPUT)));
  const byCode = new Map(existing.map((item) => [item.code, item]));
  for (const item of kept) byCode.set(item.code, item);
  const merged = cultureFileSchema.parse([...byCode.values()]);
  Deno.writeTextFileSync(OUTPUT, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✔ ${kept.length} entrées relues reprises, ${merged.length} au total → ${OUTPUT.pathname}`);
}
