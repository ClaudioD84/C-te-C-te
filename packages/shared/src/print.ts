import type { LearningSettings } from './learning-settings';
import type { StudyPack } from './study-pack';

/**
 * Export « Print & Go » (F10) : fiche de travail imprimable, mise en page accessible
 * selon le profil (police Lexend pour la dyslexie, grands espacements, peu d'éléments par page).
 */

export interface PrintMeta {
  subject: string;
  description: string;
  /** Date d'échéance lisible, ex. « jeudi 8 oct. ». */
  dueLabel: string | null;
}

export interface PrintOptions {
  /** Règles @font-face (police embarquée en base64), ou chaîne vide. */
  fontFaceCss: string;
  fontFamilyName: string;
}

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Contenu imprimable d'un paquet (sans l'enveloppe HTML). */
function packBody(pack: StudyPack, settings: LearningSettings, meta: PrintMeta): string {
  // Peu d'éléments par page pour les profils qui en ont besoin.
  const perPage = Math.max(2, settings.maxItemsPerScreen * 2);
  const e = escapeHtml;
  const parts: string[] = [];

  parts.push(
    `<header><p class="meta">${e(meta.subject)}${meta.dueLabel ? ` · pour ${e(meta.dueLabel)}` : ''}</p>`,
  );
  parts.push(`<h1>${e(pack.fiche?.title ?? meta.description)}</h1></header>`);

  if (pack.fiche) {
    for (const section of pack.fiche.sections) {
      parts.push(`<section class="block"><h2>${e(section.heading)}</h2><ul>`);
      for (const point of section.points) parts.push(`<li>${e(point)}</li>`);
      parts.push('</ul></section>');
    }
    if (pack.fiche.keyTerms.length > 0) {
      parts.push('<section class="block"><h2>Mots importants</h2><ul>');
      for (const term of pack.fiche.keyTerms)
        parts.push(`<li><strong>${e(term.term)}</strong> : ${e(term.definition)}</li>`);
      parts.push('</ul></section>');
    }
  }

  if (pack.exercises.length > 0) {
    parts.push('<h2 class="new-page">Exercices</h2>');
    pack.exercises.forEach((exercise, i) => {
      const pageBreak = i > 0 && i % perPage === 0 ? ' new-page' : '';
      parts.push(
        `<section class="block exercise${pageBreak}"><p class="number">Exercice ${i + 1}</p>` +
          `<p>${e(exercise.instruction)}</p><p class="prompt">${e(exercise.prompt)}</p>` +
          '<div class="lines"><span></span><span></span></div></section>',
      );
    });
  }

  if (pack.quiz.length > 0) {
    parts.push('<h2 class="new-page">Quiz</h2>');
    pack.quiz.forEach((question, i) => {
      const pageBreak = i > 0 && i % perPage === 0 ? ' new-page' : '';
      parts.push(
        `<section class="block${pageBreak}"><p class="number">Question ${i + 1}</p><p>${e(question.question)}</p><ul class="choices">`,
      );
      for (const choice of question.choices) parts.push(`<li><span class="box"></span>${e(choice)}</li>`);
      parts.push('</ul></section>');
    });
  }

  // Les réponses sont regroupées sur une page séparée, pour que l'enfant ne les voie pas en travaillant.
  if (pack.quiz.length > 0 || pack.exercises.length > 0) {
    parts.push('<section class="new-page answers"><h2>Réponses</h2>');
    pack.exercises.forEach((exercise, i) => parts.push(`<p>Exercice ${i + 1} : ${e(exercise.answer)}</p>`));
    pack.quiz.forEach((question, i) =>
      parts.push(
        `<p>Question ${i + 1} : ${e(question.choices[question.answerIndex] ?? '')} — ${e(question.explanation)}</p>`,
      ),
    );
    parts.push('</section>');
  }

  return parts.join('\n');
}

function documentHtml(body: string, settings: LearningSettings, options: PrintOptions): string {
  const baseSize = 13 * settings.fontScale;
  const family =
    settings.fontFamily === 'dyslexia' && options.fontFamilyName
      ? `'${options.fontFamilyName}', Verdana, sans-serif`
      : 'Verdana, Arial, sans-serif';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
${options.fontFaceCss}
@page { margin: 18mm 16mm; }
body {
  font-family: ${family};
  font-size: ${baseSize.toFixed(1)}pt;
  line-height: ${settings.lineHeight};
  letter-spacing: ${settings.letterSpacing}em;
  word-spacing: ${settings.letterSpacing > 0 ? '0.16em' : 'normal'};
  color: #111;
  background: #fff;
  text-align: left;
}
h1 { font-size: 1.6em; margin: 0 0 0.8em; }
h2 { font-size: 1.25em; margin: 1.2em 0 0.5em; }
.meta { color: #444; margin: 0; }
.block { break-inside: avoid; margin-bottom: 1em; padding: 0.6em 0.8em; border-left: 4px solid #1F7A6D; background: #F5F2EC; }
ul { padding-left: 1.2em; margin: 0.3em 0; }
li { margin-bottom: 0.4em; }
.number { font-weight: bold; color: #1F7A6D; margin: 0 0 0.3em; }
.prompt { font-weight: bold; }
.lines span { display: block; border-bottom: 1px solid #999; height: 2.2em; }
.choices { list-style: none; padding-left: 0; }
.box { display: inline-block; width: 0.9em; height: 0.9em; border: 2px solid #111; margin-right: 0.6em; vertical-align: middle; }
.new-page { break-before: page; }
.answers p { margin: 0.4em 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function buildPackHtml(
  pack: StudyPack,
  settings: LearningSettings,
  meta: PrintMeta,
  options: PrintOptions,
): string {
  return documentHtml(packBody(pack, settings, meta), settings, options);
}

/**
 * Plusieurs fiches dans un seul document (« Print & Go » de la semaine, F10) : chaque fiche commence sur une
 * nouvelle page, avec ses réponses à la fin de la fiche.
 */
export function buildPacksHtml(
  items: readonly { pack: StudyPack; meta: PrintMeta }[],
  settings: LearningSettings,
  options: PrintOptions,
): string {
  const bodies = items.map(({ pack, meta }, i) =>
    i === 0
      ? packBody(pack, settings, meta)
      : `<div class="new-page"></div>\n${packBody(pack, settings, meta)}`,
  );
  return documentHtml(bodies.join('\n'), settings, options);
}
