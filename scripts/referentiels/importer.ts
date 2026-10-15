/**
 * Convertit les référentiels structurés (donnees/*.json) en un fichier SQL d'import
 * pour la table curriculum_item. Sans réseau : peut être relancé autant que voulu.
 *
 *   deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/referentiels/importer.ts
 */
import {
  curriculumFileSchema,
  curriculumTracks,
  sortParentsFirst,
  type CurriculumFile,
} from '../../packages/shared/src/curriculum.ts';

const DATA_DIR = new URL('./donnees/', import.meta.url);
const OUTPUT = new URL('../../supabase/seed/referentiels.sql', import.meta.url);

const sql = (value: string | null) => (value === null ? 'null' : `'${value.replaceAll("'", "''")}'`);
const sqlArray = (values: readonly string[]) => `array[${values.map(sql).join(', ')}]::text[]`;

export function toSql(files: readonly CurriculumFile[]): string {
  const lines = [
    '-- Généré par scripts/referentiels/importer.ts : ne pas modifier à la main.',
    '-- Source : les fichiers de scripts/referentiels/donnees/, issus des référentiels officiels FWB.',
    '',
  ];
  const seen = new Set<string>();

  for (const file of files) {
    const { version, title, url } = file.source;
    const source = url ? `${title} (${url})` : title;
    const tracks = sqlArray(curriculumTracks(file));
    lines.push(`-- ${title} — version ${version}`);

    for (const entry of sortParentsFirst(file.entries)) {
      const key = `${version}/${entry.code}`;
      if (seen.has(key)) throw new Error(`Code en double entre fichiers : ${key}`);
      seen.add(key);

      const parent = entry.parentCode
        ? `(select id from public.curriculum_item where version = ${sql(version)} and code = ${sql(entry.parentCode)})`
        : 'null';
      lines.push(
        `insert into public.curriculum_item (code, parent_id, level, grades, tracks, subject, kind, label, source, version) values (` +
          [sql(entry.code), parent, sql(file.level), sqlArray(entry.grades), tracks, sql(entry.subject), sql(entry.kind), sql(entry.label), sql(source), sql(version)].join(', ') +
          `) on conflict (version, code) do update set parent_id = excluded.parent_id, level = excluded.level, ` +
          `grades = excluded.grades, tracks = excluded.tracks, subject = excluded.subject, kind = excluded.kind, ` +
          `label = excluded.label, source = excluded.source;`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (import.meta.main) {
  const files: CurriculumFile[] = [];
  const names = [...Deno.readDirSync(DATA_DIR)].filter((e) => e.isFile && e.name.endsWith('.json')).map((e) => e.name).sort();
  for (const name of names) {
    const result = curriculumFileSchema.safeParse(JSON.parse(Deno.readTextFileSync(new URL(name, DATA_DIR))));
    if (!result.success) {
      console.error(`✘ ${name}\n${result.error.issues.map((i) => `  ${i.path.join('.')} : ${i.message}`).join('\n')}`);
      Deno.exit(1);
    }
    files.push(result.data);
    console.log(`✔ ${name} : ${result.data.entries.length} entrées`);
  }
  Deno.writeTextFileSync(OUTPUT, toSql(files));
  console.log(`→ ${OUTPUT.pathname}`);
}
