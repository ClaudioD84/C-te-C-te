import { Anthropic } from './deps.ts';
import {
  buildContext,
  EXTRACTION_JSON_SCHEMA,
  parseExtraction,
  SYSTEM_PROMPT,
  type DocumentType,
  type Extraction,
} from './extraction.ts';
import type { Usage } from './pricing.ts';
import { UserFacingError } from './http.ts';

type Effort = 'low' | 'medium' | 'high';

/** Modèle et effort réglables sans nouvelle version de l'application (variables d'environnement). */
export const SCAN_MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-opus-5-5';
export const SCAN_EFFORT = (Deno.env.get('SCAN_EFFORT') ?? 'low') as Effort;

let client: InstanceType<typeof Anthropic> | null = null;
function anthropic() {
  // La clé est lue dans ANTHROPIC_API_KEY (secret de la fonction).
  client ??= new Anthropic();
  return client;
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
  const response = await anthropic().beta.messages.create({
    model: SCAN_MODEL,
    max_tokens: 16000,
    // Si le modèle refuse pour une raison de sécurité, l'API réessaie sur le modèle recommandé.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: SCAN_EFFORT,
      format: { type: 'json_schema', schema: EXTRACTION_JSON_SCHEMA },
    },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageBase64 } },
          { type: 'text', text: buildContext(input.grade, input.documentType, input.now) },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new UserFacingError("Cette photo n'a pas pu être analysée. Essayez avec une autre photo.", 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Réponse tronquée (max_tokens)');
  }

  const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  return { extraction: parseExtraction(text), model: response.model, usage: response.usage };
}
