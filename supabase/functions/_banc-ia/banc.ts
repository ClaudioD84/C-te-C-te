/**
 * Banc d'essai de l'IA : rejoue des cas de référence sur le modèle et l'effort configurés (mêmes variables
 * d'environnement et même code que les fonctions serveur), puis écrit un rapport qualité / coût.
 *
 *   pnpm banc-ia [--photos] [--fiches] [--repetitions 3] [--juge] [--nom sonnet] [--simulation oracle|nul]
 *
 * Voir README.md (même dossier) pour ajouter des cas et lire le rapport.
 */
import {
  extractTasksFromImage,
  generatePackFromRequest,
  PACK_EFFORT,
  PACK_MODEL,
  SCAN_EFFORT,
  SCAN_MODEL,
} from '../_shared/claude.ts';
import type { DocumentType } from '../_shared/extraction.ts';
import { UserFacingError } from '../_shared/http.ts';
import { buildPackRequest, parsePackResponse } from '../_shared/pack.ts';
import { estimateCostUsd, type Usage } from '../_shared/pricing.ts';
import { JUDGE_MODEL, judgePack, type Verdict } from './juge.ts';
import {
  checkPack,
  median,
  percent,
  scorePhoto,
  spread,
  type PhotoCase,
  type PhotoScore,
} from './notation.ts';

interface PackCase {
  id: string;
  grade: string;
  track?: string;
  needs?: string[];
  interests?: string[];
  subject: string;
  kind: string;
  description: string;
  reference?: string | null;
  /** Attendus du programme fournis au modèle (en production : lus dans la base). */
  curriculum?: string[];
}

const HERE = new URL('.', import.meta.url).pathname;
const CASE_DIRS = ['cas', 'cas-prives'].map((d) => `${HERE}${d}`);
/** Plafond par cas : au-delà, l'essai est classé « délai dépassé », jamais noté zéro. */
const CASE_TIMEOUT_MS = 240_000;

// ---------------------------------------------------------------------------------------------------------
// Options
const args = Deno.args;
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const runPhotos = flag('photos') || !flag('fiches');
const runPacks = flag('fiches') || !flag('photos');
const repetitions = Math.max(1, Number(option('repetitions') ?? 1));
const withJudge = flag('juge');
const simulation = option('simulation') as 'oracle' | 'nul' | undefined;
if (simulation && simulation !== 'oracle' && simulation !== 'nul')
  throw new Error('--simulation oracle ou nul');
const name = option('nom') ?? (simulation ? `simulation-${simulation}` : `${SCAN_MODEL}-${SCAN_EFFORT}`);
if (!simulation && !Deno.env.get('ANTHROPIC_API_KEY'))
  throw new Error('ANTHROPIC_API_KEY manquante (ou lancez une vérification gratuite : --simulation oracle).');

const stamp = new Date().toISOString().slice(0, 16).replace(':', 'h');
const outDir = `${HERE}resultats/${stamp}-${name.replace(/[^\w.-]+/g, '-')}`;
await Deno.mkdir(`${outDir}/sorties`, { recursive: true });

const results: Record<string, unknown>[] = [];
const errors: Record<string, unknown>[] = [];

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), CASE_TIMEOUT_MS)),
  ]);
}

function errorClass(error: unknown): string {
  if (error instanceof UserFacingError && error.status === 422) return 'refus';
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'délai dépassé') return 'delai';
  if (message.includes('max_tokens')) return 'tronque';
  if (error instanceof SyntaxError || /zod|invalid/i.test(message)) return 'reponse_illisible';
  return 'technique';
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function listCases(sub: string, extension: string): Promise<string[]> {
  const files: string[] = [];
  for (const dir of CASE_DIRS) {
    try {
      for await (const entry of Deno.readDir(`${dir}/${sub}`)) {
        if (entry.isFile && entry.name.endsWith(extension)) files.push(`${dir}/${sub}/${entry.name}`);
      }
    } catch {
      // Dossier absent (cas-prives n'existe que chez vous).
    }
  }
  return files.sort();
}

// ---------------------------------------------------------------------------------------------------------
// Lecture des photos
const photoScores: { id: string; rep: number; score: PhotoScore; cost: number; seconds: number }[] = [];

if (runPhotos) {
  for (const jsonPath of await listCases('photos', '.json')) {
    const expected = JSON.parse(await Deno.readTextFile(jsonPath)) as PhotoCase;
    const imagePath = jsonPath.replace(/\.json$/, '.jpg');
    for (let rep = 1; rep <= repetitions; rep++) {
      const started = performance.now();
      try {
        let read: Parameters<typeof scorePhoto>[1];
        let usage: Usage = { input_tokens: 0, output_tokens: 0 };
        let served = SCAN_MODEL;
        if (simulation === 'oracle') {
          read = {
            tasks: expected.tasks.map((t) => ({
              subject: t.subject,
              kind: t.kind,
              description: t.keywords.join(' '),
              dueDate: t.dueDate ?? null,
            })),
            spellingWords: expected.spellingWords,
            vocabulary: expected.vocabulary?.map((term) => ({ term })),
          };
        } else if (simulation === 'nul') {
          read = { tasks: [] };
        } else {
          const result = await withTimeout(
            extractTasksFromImage({
              imageBase64: encodeBase64(await Deno.readFile(imagePath)),
              grade: expected.grade,
              documentType: expected.documentType as DocumentType | null,
              now: new Date(`${expected.today}T10:00:00+02:00`),
            }),
          );
          await Deno.writeTextFile(`${outDir}/sorties/${expected.id}-${rep}.json`, result.text);
          read = result.extraction;
          usage = result.usage;
          served = result.model;
        }
        const seconds = (performance.now() - started) / 1000;
        const cost = estimateCostUsd(served, usage);
        // Réponse servie par un autre modèle (repli après un refus) : elle ne mesure pas le modèle testé.
        if (served !== SCAN_MODEL) {
          errors.push({
            partie: 'photos',
            cas: expected.id,
            rep,
            classe: 'repli',
            modele_servi: served,
            cost,
          });
          continue;
        }
        const score = scorePhoto(expected, read);
        photoScores.push({ id: expected.id, rep, score, cost, seconds });
        results.push({
          partie: 'photos',
          cas: expected.id,
          rep,
          modele: served,
          ...score,
          usage,
          cost,
          seconds,
        });
      } catch (error) {
        errors.push({
          partie: 'photos',
          cas: expected.id,
          rep,
          classe: errorClass(error),
          message: String(error),
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Fiches
const packRows: {
  id: string;
  rep: number;
  ok: boolean;
  problems: string[];
  verdict: Verdict | null;
  cost: number;
  judgeCost: number;
  seconds: number;
}[] = [];

const SAMPLE_PACK = {
  topicUnclear: false,
  fiche: { title: 'Exemple', sections: [{ heading: 'Partie', points: ['Point'] }], keyTerms: [] },
  quiz: [1, 2, 3],
  exercises: [],
  flashcards: [1, 2, 3],
};

if (runPacks) {
  for (const path of await listCases('.', 'fiches.json')) {
    const cases = JSON.parse(await Deno.readTextFile(path)) as PackCase[];
    for (const c of cases) {
      for (let rep = 1; rep <= repetitions; rep++) {
        const started = performance.now();
        try {
          let content: typeof SAMPLE_PACK | ReturnType<typeof parsePackResponse>['content'];
          let usage: Usage = { input_tokens: 0, output_tokens: 0 };
          let served = PACK_MODEL;
          if (simulation === 'oracle') content = SAMPLE_PACK;
          else if (simulation === 'nul')
            content = { topicUnclear: false, fiche: null, quiz: [], exercises: [], flashcards: [] } as never;
          else {
            const request = buildPackRequest({
              grade: c.grade,
              track: c.track ?? 'general',
              needs: c.needs ?? [],
              interests: c.interests ?? [],
              task: {
                subject: c.subject,
                kind: c.kind,
                description: c.description,
                reference: c.reference ?? null,
              },
              curriculum: c.curriculum ?? [],
            });
            const result = await withTimeout(generatePackFromRequest(request));
            await Deno.writeTextFile(`${outDir}/sorties/fiche-${c.id}-${rep}.json`, result.text);
            content = parsePackResponse(result.text, c.curriculum?.length ?? 0).content;
            usage = result.usage;
            served = result.model;
          }
          const seconds = (performance.now() - started) / 1000;
          const cost = estimateCostUsd(served, usage);
          if (served !== PACK_MODEL) {
            errors.push({ partie: 'fiches', cas: c.id, rep, classe: 'repli', modele_servi: served, cost });
            continue;
          }
          const check = checkPack(content as Parameters<typeof checkPack>[0]);
          let verdict: Verdict | null = null;
          let judgeCost = 0;
          if (withJudge && !simulation) {
            const judged = await withTimeout(
              judgePack({ grade: c.grade, needs: c.needs ?? [], task: c, pack: content }),
            );
            verdict = judged.verdict;
            judgeCost = estimateCostUsd(judged.result.model, judged.result.usage);
          }
          packRows.push({
            id: c.id,
            rep,
            ok: check.ok,
            problems: check.problems,
            verdict,
            cost,
            judgeCost,
            seconds,
          });
          results.push({
            partie: 'fiches',
            cas: c.id,
            rep,
            modele: served,
            ...check,
            verdict,
            usage,
            cost,
            judgeCost,
            seconds,
          });
        } catch (error) {
          errors.push({
            partie: 'fiches',
            cas: c.id,
            rep,
            classe: errorClass(error),
            message: String(error),
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Rapport
const lines: string[] = [];
const dollars = (n: number) => `${n.toFixed(4)} $`;
const errorCount = (part: string, cls?: string) =>
  errors.filter((e) => e.partie === part && (!cls || e.classe === cls)).length;
/** Mesure moyenne par passage (moyenne des cas), puis étendue entre passages. */
function perRep<T extends { rep: number }>(rows: T[], value: (row: T) => number | null) {
  const reps = [...new Set(rows.map((r) => r.rep))];
  return spread(
    reps.map((rep) => {
      const values = rows
        .filter((r) => r.rep === rep)
        .map(value)
        .filter((v): v is number => v !== null);
      return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
    }),
  );
}

lines.push(`# Banc d'essai de l'IA — ${name}`, '');
lines.push(
  `Le ${new Date().toLocaleString('fr-BE')} · lecture : ${SCAN_MODEL} (effort ${SCAN_EFFORT}) · fiches : ${PACK_MODEL} ` +
    `(effort ${PACK_EFFORT})${withJudge ? ` · juge : ${JUDGE_MODEL}` : ''} · ${repetitions} passage(s)` +
    (simulation ? ` · **simulation ${simulation} (aucun appel à l'IA)**` : ''),
  '',
);

if (runPhotos) {
  const cases = new Set(photoScores.map((p) => p.id)).size;
  lines.push(`## Lecture des photos (${cases} cas)`, '', '| Mesure | Résultat |', '|---|---|');
  lines.push(`| Devoirs retrouvés (rappel) | ${percent(perRep(photoScores, (p) => p.score.recall))} |`);
  lines.push(
    `| Devoirs lus qui sont justes (précision) | ${percent(perRep(photoScores, (p) => p.score.precision))} |`,
  );
  lines.push(
    `| Dates justes (devoirs retrouvés) | ${percent(perRep(photoScores, (p) => p.score.dateAccuracy))} |`,
  );
  lines.push(`| Mots de dictée retrouvés | ${percent(perRep(photoScores, (p) => p.score.spellingRecall))} |`);
  lines.push(`| Vocabulaire retrouvé | ${percent(perRep(photoScores, (p) => p.score.vocabularyRecall))} |`);
  lines.push(
    `| Coût moyen par photo | ${dollars(photoScores.reduce((a, p) => a + p.cost, 0) / Math.max(photoScores.length, 1))} |`,
  );
  lines.push(`| Temps médian | ${median(photoScores.map((p) => p.seconds)).toFixed(1)} s |`);
  lines.push(
    `| Non notés : refus / repli / délai / tronqué / illisible / technique | ${['refus', 'repli', 'delai', 'tronque', 'reponse_illisible', 'technique'].map((c) => errorCount('photos', c)).join(' / ')} |`,
    '',
  );
  lines.push('| Cas | Passage | Attendus | Lus | Retrouvés | Dates justes |', '|---|---|---|---|---|---|');
  for (const p of photoScores)
    lines.push(
      `| ${p.id} | ${p.rep} | ${p.score.expected} | ${p.score.read} | ${p.score.found} | ${p.score.datesRight}/${p.score.datesChecked} |`,
    );
  lines.push('');
}

if (runPacks) {
  const cases = new Set(packRows.map((p) => p.id)).size;
  lines.push(`## Fiches (${cases} cas)`, '', '| Mesure | Résultat |', '|---|---|');
  lines.push(`| Fiches complètes (contrôle sans IA) | ${percent(perRep(packRows, (p) => (p.ok ? 1 : 0)))} |`);
  if (withJudge) {
    for (const key of ['exactitude', 'niveau', 'couverture', 'adaptations', 'clarte'] as const) {
      const s = spread(packRows.map((p) => (p.verdict ? (p.verdict[key] as number | null) : null)));
      lines.push(`| Juge : ${key} (sur 5) | ${s ? `${s.mean.toFixed(1)} (${s.min}–${s.max})` : '—'} |`);
    }
    const flagged = packRows.reduce((a, p) => a + (p.verdict?.erreurs.length ?? 0), 0);
    lines.push(`| Erreurs de fond relevées par le juge | ${flagged} |`);
    lines.push(`| Coût du juge (en plus) | ${dollars(packRows.reduce((a, p) => a + p.judgeCost, 0))} |`);
  }
  lines.push(
    `| Coût moyen par fiche | ${dollars(packRows.reduce((a, p) => a + p.cost, 0) / Math.max(packRows.length, 1))} |`,
  );
  lines.push(`| Temps médian | ${median(packRows.map((p) => p.seconds)).toFixed(1)} s |`);
  lines.push(
    `| Non notés : refus / repli / délai / tronqué / illisible / technique | ${['refus', 'repli', 'delai', 'tronque', 'reponse_illisible', 'technique'].map((c) => errorCount('fiches', c)).join(' / ')} |`,
    '',
  );
  const problems = packRows.filter((p) => !p.ok || (p.verdict && p.verdict.erreurs.length > 0));
  if (problems.length > 0) {
    lines.push('### Fiches à regarder', '');
    for (const p of problems)
      lines.push(
        `- ${p.id} (passage ${p.rep}) : ${[...p.problems, ...(p.verdict?.erreurs ?? [])].join(' ; ')}`,
      );
    lines.push('');
  }
}

lines.push(
  `Détails : \`resultats.jsonl\`, essais non notés : \`erreurs.jsonl\`, réponses brutes : \`sorties/\`.`,
);

await Deno.writeTextFile(
  `${outDir}/resultats.jsonl`,
  results.map((r) => JSON.stringify(r)).join('\n') + '\n',
);
await Deno.writeTextFile(`${outDir}/erreurs.jsonl`, errors.map((r) => JSON.stringify(r)).join('\n') + '\n');
await Deno.writeTextFile(`${outDir}/synthese.md`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nRapport : ${outDir}/synthese.md`);
