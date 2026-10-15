import { Anthropic } from './deps.ts';
import {
  buildContext,
  EXTRACTION_JSON_SCHEMA,
  parseExtraction,
  SYSTEM_PROMPT,
  type DocumentType,
  type Extraction,
} from './extraction.ts';
import { UserFacingError } from './http.ts';
import { PACK_JSON_SCHEMA, PACK_SYSTEM_PROMPT } from './pack.ts';
import type { Usage } from './pricing.ts';

type Effort = 'low' | 'medium' | 'high';

/**
 * Modèle et effort réglables sans nouvelle version de l'application (variables d'environnement). Lecture des photos
 * (écriture manuscrite) : Opus ; fiches, dossiers de révision et explications : Sonnet, deux fois moins cher.
 */
export const SCAN_MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-opus-5-5';
export const SCAN_EFFORT = (Deno.env.get('SCAN_EFFORT') ?? 'low') as Effort;
export const PACK_MODEL = Deno.env.get('PACK_MODEL') ?? 'claude-sonnet-5-5';
export const PACK_EFFORT = (Deno.env.get('PACK_EFFORT') ?? 'medium') as Effort;

let client: InstanceType<typeof Anthropic> | null = null;
function anthropic() {
  // La clé est lue dans ANTHROPIC_API_KEY (secret de la fonction).
  client ??= new Anthropic();
  return client;
}

type UserContent = Parameters<
  InstanceType<typeof Anthropic>['beta']['messages']['create']
>[0]['messages'][number]['content'];

export interface StructuredResult {
  text: string;
  model: string;
  usage: Usage;
}

/** Appel à Claude avec une réponse JSON imposée par un schéma (sorties structurées). */
export async function structuredCall(input: {
  model: string;
  effort: Effort;
  system: string;
  content: UserContent;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<StructuredResult> {
  const response = await anthropic()
    .beta.messages.stream({
      model: input.model,
      max_tokens: input.maxTokens ?? 16000,
      // Si le modèle refuse pour une raison de sécurité, l'API réessaie sur le modèle recommandé.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: input.effort, format: { type: 'json_schema', schema: input.schema } },
      system: [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: input.content }],
    })
    .finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new UserFacingError("Ce contenu n'a pas pu être traité. Essayez de reformuler la tâche.", 422);
  }
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse tronquée (max_tokens)');

  const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  return { text, model: response.model, usage: response.usage };
}

export interface ExtractionResult {
  extraction: Extraction;
  model: string;
  usage: Usage;
  /** Réponse brute (JSON) du modèle, gardée par le banc d'essai. */
  text: string;
}

/** Lecture d'un document photographié : une image par page, dans l'ordre. */
export async function extractTasksFromImages(input: {
  imagesBase64: string[];
  grade: string;
  documentType: DocumentType | null;
  now: Date;
}): Promise<ExtractionResult> {
  const pages = input.imagesBase64.length;
  const result = await structuredCall({
    model: SCAN_MODEL,
    effort: SCAN_EFFORT,
    system: SYSTEM_PROMPT,
    schema: EXTRACTION_JSON_SCHEMA,
    content: [
      // Plusieurs pages : chacune est annoncée avant son image.
      ...input.imagesBase64.flatMap((data, i) => [
        ...(pages > 1 ? [{ type: 'text' as const, text: `Page ${i + 1} sur ${pages} :` }] : []),
        {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
        },
      ]),
      { type: 'text', text: buildContext(input.grade, input.documentType, input.now, pages) },
    ],
  });
  return {
    extraction: parseExtraction(result.text, input.now),
    model: result.model,
    usage: result.usage,
    text: result.text,
  };
}

/** Paquet d'étude d'une demande (texte construit par buildPackRequest) : fonction serveur et banc d'essai. */
export function generatePackFromRequest(requestText: string): Promise<StructuredResult> {
  return structuredCall({
    model: PACK_MODEL,
    effort: PACK_EFFORT,
    system: PACK_SYSTEM_PROMPT,
    schema: PACK_JSON_SCHEMA,
    maxTokens: 32000,
    content: [{ type: 'text', text: requestText }],
  });
}
