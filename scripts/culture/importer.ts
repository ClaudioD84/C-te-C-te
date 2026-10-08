/**
 * Importe la base de contenus culturels vérifiés (scripts/culture/contenus.json)
 * en un fichier SQL idempotent : supabase/seed/culture.sql.
 *
 *   deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/culture/importer.ts
 */
import { cultureFileSchema, type CulturalResource } from '../../packages/shared/src/culture.ts';

const INPUT = new URL('./contenus.json', import.meta.url);
const OUTPUT = new URL('../../supabase/seed/culture.sql', import.meta.url);

const sql = (value: string | null) => (value === null ? 'null' : `'${value.replaceAll("'", "''")}'`);
const sqlArray = (values: readonly string[]) => `array[${values.map(sql).join(', ')}]::text[]`;

export function toSql(items: readonly CulturalResource[]): string {
  const lines = ['-- Généré par scripts/culture/importer.ts : ne pas modifier à la main.', ''];
  for (const item of items) {
    lines.push(
      'insert into public.cultural_resource (code, kind, title, description, url, place, subjects, grades, verified_on) values (' +
        [
          sql(item.code),
          sql(item.kind),
          sql(item.title),
          sql(item.description),
          sql(item.url),
          sql(item.place),
          sqlArray(item.subjects),
          sqlArray(item.grades),
          sql(item.verifiedOn),
        ].join(', ') +
        ') on conflict (code) do update set kind = excluded.kind, title = excluded.title, description = excluded.description, ' +
        'url = excluded.url, place = excluded.place, subjects = excluded.subjects, grades = excluded.grades, verified_on = excluded.verified_on;',
    );
  }
  return lines.join('\n') + '\n';
}

if (import.meta.main) {
  const result = cultureFileSchema.safeParse(JSON.parse(Deno.readTextFileSync(INPUT)));
  if (!result.success) {
    console.error(result.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`).join('\n'));
    Deno.exit(1);
  }
  Deno.writeTextFileSync(OUTPUT, toSql(result.data));
  console.log(`✔ ${result.data.length} contenus → ${OUTPUT.pathname}`);
}
