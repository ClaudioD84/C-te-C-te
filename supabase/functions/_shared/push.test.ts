import { assertEquals } from 'jsr:@std/assert@1';

import { pushMessage } from './push.ts';

Deno.test('messages au parent : le prénom seulement (ni matière, ni tâche)', () => {
  assertEquals(pushMessage('aide', 'Léo'), {
    title: "🙋 Léo a besoin d'aide",
    body: 'Ouvrez Côte à Côte pour voir sur quelle activité.',
  });
  assertEquals(pushMessage('mission', 'Emma').title, '✅ Emma a terminé sa mission du jour');
});
