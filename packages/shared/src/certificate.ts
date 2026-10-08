import { formatShortDate, type IsoDate } from './dates';
import { escapeHtml } from './print';
import { BADGES, type BadgeCode } from './rewards';

/**
 * Diplôme d'un badge (F11), à imprimer et afficher : il célèbre un effort (régularité, persévérance),
 * jamais une note. Page A4 paysage, sans image externe.
 */
export function buildCertificateHtml(input: {
  alias: string;
  avatar: string;
  badge: BadgeCode;
  earnedOn: IsoDate;
}): string {
  const badge = BADGES[input.badge];
  const e = escapeHtml;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Diplôme ${e(badge.title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Verdana, sans-serif; margin: 0; color: #1d2733; }
  .page { border: 10px double #1b6e5a; border-radius: 24px; padding: 32px; text-align: center;
          min-height: 150mm; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .emoji { font-size: 72px; line-height: 1.1; }
  h1 { font-size: 40px; margin: 0; letter-spacing: 2px; color: #1b6e5a; }
  .alias { font-size: 34px; font-weight: bold; }
  .what { font-size: 22px; }
  .date { font-size: 16px; color: #556270; }
</style></head>
<body><div class="page">
  <div class="emoji">${e(input.avatar)} ${e(badge.emoji)}</div>
  <h1>Diplôme « ${e(badge.title)} »</h1>
  <div class="what">décerné à</div>
  <div class="alias">${e(input.alias)}</div>
  <div class="what">${e(badge.description)}</div>
  <div class="what">Bravo pour tes efforts !</div>
  <div class="date">Le ${e(formatShortDate(input.earnedOn))} · Côte à Côte</div>
</div></body></html>`;
}
