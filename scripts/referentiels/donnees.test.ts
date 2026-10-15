import { assertEquals } from 'jsr:@std/assert@1';

/**
 * Garde-fou sur les données découpées : un tableau lu sur plusieurs colonnes donne du texte mélangé
 * (« Trier des Dire, en situa- S’exercer, Découvrir… »). Ces signes ne doivent apparaître dans aucun attendu.
 */
function looksMixed(label: string): boolean {
  // Plusieurs mots coupés en fin de colonne (« situa- », « mathéma- ») au milieu du texte.
  const cutWords = label.match(/\p{L}{3,}- (?=\p{Ll})/gu)?.length ?? 0;
  // Abréviations des tableaux de croisement : (SF) savoir-faire, (C) compétence.
  const tableMarks = /\((SF|C)\)\./.test(label);
  return cutWords >= 2 || tableMarks;
}

Deno.test('aucun attendu issu de tableaux à plusieurs colonnes (tous les référentiels)', async () => {
  const mixed: string[] = [];
  for await (const entry of Deno.readDir(new URL('./donnees/', import.meta.url))) {
    if (!entry.name.endsWith('.json')) continue;
    const file = JSON.parse(await Deno.readTextFile(new URL(`./donnees/${entry.name}`, import.meta.url)));
    for (const e of file.entries as { code: string; kind: string; label: string }[]) {
      if (e.kind === 'attendu' && looksMixed(e.label))
        mixed.push(`${entry.name} ${e.code} : ${e.label.slice(0, 80)}`);
    }
  }
  assertEquals(mixed, []);
});

Deno.test('le détecteur reconnaît le texte mélangé', () => {
  assertEquals(looksMixed('Trier des Dire, en situa- tion de pro- lors d’une dans le'), true);
  assertEquals(looksMixed('- aux gestes patrimoine événements culturels. en fonction (SF). lieux'), true);
  assertEquals(looksMixed('Dénombrer une collection d’objets jusqu’à 9 à minima.'), false);
  assertEquals(looksMixed('Désigner et nommer au moins six parties du corps : tête, bras, main.'), false);
});
