# Contenus culturels (F6)

`contenus.json` contient les suggestions « pour aller plus loin » : documentaires, musées, sorties, livres,
jeux éducatifs. **Chaque entrée doit être vérifiée par une personne** (lien actif, lieu ouvert, contenu adapté
à l'âge) : l'application n'invente jamais de suggestion.

Format d'une entrée : voir `culturalResourceSchema` dans `packages/shared/src/culture.ts`.

```bash
pnpm exec deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/culture/importer.ts
```

Le fichier `supabase/seed/culture.sql` est régénéré ; en production, exécutez-le dans l'éditeur SQL de Supabase.
Revérifiez les entrées dont `verifiedOn` date de plus d'un an.
