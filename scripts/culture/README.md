# Contenus culturels (F6)

`contenus.json` contient les suggestions « pour aller plus loin » : documentaires, musées, sorties, livres,
jeux, musique, art, spectacles, patrimoine. **Chaque entrée doit être vérifiée par une personne** (lien actif,
lieu ouvert, contenu adapté à l'âge) : l'application n'invente jamais de suggestion.

Format d'une entrée : voir `culturalResourceSchema` dans `packages/shared/src/culture.ts`.

## Relecture

`a-relire.csv` (à ouvrir dans Excel ou LibreOffice, séparateur « ; ») liste des candidats repris **uniquement**
des repères culturels et artistiques du Référentiel d'Éducation culturelle et artistique (2022), de P1 à S3.
Il est produit par `python3 scripts/culture/candidats.py` (refuse d'écraser un fichier existant sans `--force`).

Pour chaque ligne :

1. `garder` : `oui` pour la publier, vide sinon ;
2. `titre`, `description` (400 caractères au plus), `lieu`, `annees`, `matieres` : corriger si besoin
   (plusieurs valeurs séparées par `|`) ;
3. `lien` : facultatif, une adresse vérifiée (site officiel, page de musée, enregistrement libre de droits…) ;
4. `verifie_le` : date de la vérification (`2026-10-05` ou `05/10/2026`), obligatoire pour une ligne gardée.

Puis reporter les lignes gardées dans `contenus.json` et générer le SQL :

```bash
pnpm exec deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/culture/valider.ts
pnpm exec deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/culture/importer.ts
```

Le fichier `supabase/seed/culture.sql` est régénéré ; en production, exécutez-le dans l'éditeur SQL de Supabase.
Revérifiez les entrées dont `verifiedOn` date de plus d'un an.
