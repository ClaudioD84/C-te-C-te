/**
 * Structure un référentiel officiel (PDF) en fichier JSON pour l'application, avec Claude.
 * Le fichier produit DOIT être relu avant import : le contenu officiel ne doit pas être déformé.
 *
 *   ANTHROPIC_API_KEY=... deno run --config scripts/referentiels/deno.json --allow-read --allow-write \
 *     --allow-env --allow-net scripts/referentiels/extraire.ts \
 *     --pdf chemin/referentiel.pdf --niveau primaire --matiere "Français" \
 *     --titre "Référentiel de Français et Langues anciennes" --version 2022 --prefixe FR [--url https://...]
 */
import Anthropic from '@anthropic-ai/sdk';
import { parseArgs } from 'jsr:@std/cli@1/parse-args';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import { curriculumFileSchema, CURRICULUM_KINDS } from '../../packages/shared/src/curriculum.ts';
import { GRADES } from '../../packages/shared/src/school.ts';

const args = parseArgs(Deno.args, { string: ['pdf', 'niveau', 'matiere', 'titre', 'version', 'prefixe', 'url', 'modele'] });
for (const required of ['pdf', 'niveau', 'matiere', 'titre', 'version', 'prefixe'] as const) {
  if (!args[required]) {
    console.error(`Paramètre manquant : --${required}`);
    Deno.exit(1);
  }
}

const ENTRIES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['entries'],
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'parentCode', 'kind', 'grades', 'label'],
        properties: {
          code: { type: 'string' },
          parentCode: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          kind: { type: 'string', enum: [...CURRICULUM_KINDS] },
          grades: { type: 'array', items: { type: 'string', enum: [...GRADES] } },
          label: { type: 'string' },
        },
      },
    },
  },
} as const;

const instructions = `Ce PDF est un référentiel officiel de la Fédération Wallonie-Bruxelles (${args.matiere}, ${args.niveau}).
Structure-le en une liste à plat de domaines, compétences et attendus.

Règles :
1. Recopie les intitulés mot pour mot (orthographe et ponctuation comprises). Ne reformule pas, ne résume pas, n'ajoute rien.
2. "kind" : "domaine" pour les grandes parties, "competence" pour les savoirs, savoir-faire ou compétences, "attendu" pour les attendus d'apprentissage.
3. "code" : préfixe « ${args.prefixe} » puis une numérotation hiérarchique stable (ex. ${args.prefixe}-2, ${args.prefixe}-2-3, ${args.prefixe}-2-3-1). Utilise la numérotation du document si elle existe.
4. "parentCode" : code de l'élément parent ; null uniquement pour un domaine.
5. "grades" : années scolaires concernées (M1 à M3, P1 à P6, S1 à S7) selon les tableaux de progression du document ; liste vide si le document ne le précise pas.
6. Ignore les introductions, glossaires, sommaires et pages de méthodologie.`;

const pdf = encodeBase64(await Deno.readFile(args.pdf!));
const client = new Anthropic();
console.log('Analyse du référentiel en cours (plusieurs minutes possibles)…');

const message = await client.beta.messages
  .stream({
    model: args.modele ?? 'claude-opus-5-5',
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: ENTRIES_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } },
          { type: 'text', text: instructions },
        ],
      },
    ],
  })
  .finalMessage();

if (message.stop_reason === 'max_tokens') {
  console.error('Réponse tronquée : découpez le PDF (par exemple un fichier par domaine) et relancez.');
  Deno.exit(1);
}
if (message.stop_reason === 'refusal') {
  console.error('Le modèle a refusé de traiter ce document.');
  Deno.exit(1);
}

const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
const { entries } = JSON.parse(text) as { entries: Record<string, unknown>[] };
const file = curriculumFileSchema.parse({
  source: { title: args.titre, url: args.url ?? null, version: args.version },
  level: args.niveau,
  entries: entries.map((entry) => ({ ...entry, subject: args.matiere })),
});

const output = new URL(`./donnees/${args.prefixe!.toLowerCase()}-${args.version}.json`, import.meta.url);
Deno.writeTextFileSync(output, JSON.stringify(file, null, 2) + '\n');
console.log(`✔ ${file.entries.length} entrées → ${output.pathname}`);
console.log('Relisez ce fichier avant de lancer importer.ts.');
console.log(`Tokens : ${message.usage.input_tokens} en entrée, ${message.usage.output_tokens} en sortie.`);
