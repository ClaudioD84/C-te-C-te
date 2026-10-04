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
import type { Usage } from './pricing.ts';

type Effort = 'low' | 'medium' | 'high';

/** Modèle et effort réglables sans nouvelle version de l'application (variables d'environnement). */
export const SCAN_MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-opus-5-5';
export const SCAN_EFFORT = (Deno.env.get('SCAN_EFFORT') ?? 'low') as Effort;
export const PACK_MODEL = Deno.env.get('PACK_MODEL') ?? 'claude-opus-5-5';
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
}

export async function extractTasksFromImage(input: {
  imageBase64: string;
  grade: string;
  documentType: DocumentType | null;
  now: Date;
}): Promise<ExtractionResult> {
  const result = await structuredCall({
    model: SCAN_MODEL,
    effort: SCAN_EFFORT,
    system: SYSTEM_PROMPT,
    schema: EXTRACTION_JSON_SCHEMA,
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageBase64 } },
      { type: 'text', text: buildContext(input.grade, input.documentType, input.now) },
    ],
  });
  return { extraction: parseExtraction(result.text), model: result.model, usage: result.usage };
}
