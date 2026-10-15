import { assertEquals } from 'jsr:@std/assert@1';

import { parseCsv, toResources } from './valider.ts';

const HEADER = 'garder;code;type;titre;description;lieu;lien;verifie_le;matieres;annees;source;remarques';

Deno.test('reprend seulement les lignes gardées, avec guillemets et date française', () => {
  const rows = parseCsv(
    '﻿' +
      [
        HEADER,
        'oui;t-1;musique;"« Titre ; avec point-virgule »";Fictif.;;https://exemple.org;05/10/2026;Éducation culturelle et artistique;P1 | P3;;',
        ';t-2;musique;Écarté;Fictif.;;;;Éducation culturelle et artistique;P1;;',
      ].join('\r\n'),
  );
  const { kept, problems } = toResources(rows);
  assertEquals(problems, []);
  assertEquals(kept.length, 1);
  assertEquals(kept[0].title, '« Titre ; avec point-virgule »');
  assertEquals(kept[0].grades, ['P1', 'P3']);
  assertEquals(kept[0].verifiedOn, '2026-10-05');
});

Deno.test('signale une ligne gardée sans date de vérification', () => {
  const { kept, problems } = toResources(
    parseCsv([HEADER, 'x;t-3;patrimoine;Lieu;Fictif.;Namur;;;Sciences;S1;;'].join('\n')),
  );
  assertEquals(kept.length, 0);
  assertEquals(problems.length, 1);
});
