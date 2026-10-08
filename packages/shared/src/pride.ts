import { formatShortDate, type IsoDate } from './dates';
import { escapeHtml } from './print';

/**
 * Carnet de fierté : chaque semaine, l'enfant note un moment dont il est fier, à l'école ou ailleurs
 * (un geste, un progrès, un dessin…). Le parent le voit et peut l'imprimer en fin d'année.
 */
export const PRIDE_EMOJIS = ['⭐', '🏆', '💪', '🤝', '🎨', '📚', '⚽', '🎵', '🌱', '😊'] as const;
export type PrideEmoji = (typeof PRIDE_EMOJIS)[number];
export const PRIDE_MAX_LENGTH = 140;

export const PRIDE_PROMPTS = [
  'J’ai aidé quelqu’un',
  'J’ai réussi quelque chose de difficile',
  'J’ai appris quelque chose de nouveau',
  'J’ai été courageux·se',
  'J’ai fait un beau dessin ou un bricolage',
] as const;

export interface PrideEntry {
  emoji: string;
  text: string | null;
  date: IsoDate;
}

export function isPrideEmoji(value: string): value is PrideEmoji {
  return (PRIDE_EMOJIS as readonly string[]).includes(value);
}

/** Carnet imprimable (A4), du plus ancien au plus récent. */
export function buildPrideBookHtml(alias: string, entries: readonly PrideEntry[]): string {
  const e = escapeHtml;
  const items = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (entry) =>
        `<li><span class="emoji">${e(entry.emoji)}</span><div><div class="date">${e(formatShortDate(entry.date))}</div>${
          entry.text ? `<div>${e(entry.text)}</div>` : ''
        }</div></li>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Carnet de fierté de ${e(alias)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Verdana, sans-serif; color: #1d2733; }
  h1 { color: #1b6e5a; text-align: center; }
  ul { list-style: none; padding: 0; }
  li { display: flex; gap: 14px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #d9d2c5;
       break-inside: avoid; font-size: 16px; }
  .emoji { font-size: 32px; line-height: 1; }
  .date { color: #556270; font-size: 13px; }
</style></head>
<body>
  <h1>🌟 Le carnet de fierté de ${e(alias)}</h1>
  <ul>
${items}
  </ul>
</body></html>`;
}
