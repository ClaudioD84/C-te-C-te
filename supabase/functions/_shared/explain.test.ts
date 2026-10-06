import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert@1';

import { buildExplainRequest, parseExplanation } from './explain.ts';

Deno.test('demande : partie, adaptations, centres d’intérêt ; jamais le nom du trouble', () => {
  const request = buildExplainRequest({
    grade: 'P5',
    needs: ['dyslexie'],
    interests: ['le football'],
    subject: 'Éveil',
    ficheTitle: 'Les fleuves',
    heading: 'La Meuse',
    points: ['Elle traverse Namur et Liège.'],
  });
  assertStringIncludes(request, 'Partie à réexpliquer : « La Meuse »');
  assertStringIncludes(request, '- Elle traverse Namur et Liège.');
  assertStringIncludes(request, "Centres d'intérêt de l'élève : le football.");
  assertEquals(request.toLowerCase().includes('dyslexie'), false);
});

Deno.test('réponse : validée', () => {
  assertEquals(parseExplanation('{"explanation":"A.","example":"B."}'), { explanation: 'A.', example: 'B.' });
  assertThrows(() => parseExplanation('{"explanation":""}'));
});
