// Vérifie la longueur des champs de fiche-stores.md (limites d'App Store Connect et de Google Play).
import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('./fiche-stores.md', import.meta.url), 'utf8');
const fields = [...text.matchAll(/<!-- champ: (\S+) \| max: (\d+) -->\n([\s\S]*?)(?=\n<!--|\n## )/g)];
let ok = true;
for (const [, name, max, raw] of fields) {
  // Les retours à la ligne d'une même phrase sont recollés, les paragraphes conservés.
  const value = raw.trim().replace(/([^\n])\n(?!\n)/g, '$1 ');
  const length = name === 'mots-cles-apple' ? Buffer.byteLength(value) : [...value].length;
  const status = length <= Number(max) ? 'ok' : 'TROP LONG';
  if (status !== 'ok') ok = false;
  console.log(`${status.padEnd(9)} ${name} : ${length} / ${max}`);
}
process.exit(ok ? 0 : 1);
