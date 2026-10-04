# Référentiels FWB

Les référentiels officiels sont publiés en PDF sur enseignement.be. Ce dossier les transforme en données
pour la table `curriculum_item` (fonctionnalité F2).

## 1. Structurer un PDF avec Claude

```bash
ANTHROPIC_API_KEY=... pnpm exec deno run --config scripts/referentiels/deno.json \
  --allow-read --allow-write --allow-env --allow-net scripts/referentiels/extraire.ts \
  --pdf ~/Téléchargements/referentiel-francais.pdf \
  --niveau primaire --matiere "Français" --prefixe FR --version 2022 \
  --titre "Référentiel de Français et de Langues anciennes" \
  --url "https://www.enseignement.be/..."
```

Le résultat est écrit dans `donnees/<prefixe>-<version>.json`.

**Relisez toujours ce fichier** : les intitulés doivent être identiques au document officiel.
Si la réponse est tronquée, découpez le PDF (un fichier par domaine) et utilisez un préfixe par partie.

## 2. Générer le SQL

```bash
pnpm exec deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/referentiels/importer.ts
```

Le fichier `supabase/seed/referentiels.sql` est régénéré. Il est chargé par `supabase db reset` en local ;
en production, exécutez-le une fois dans l'éditeur SQL du tableau de bord Supabase. L'import est
idempotent : le relancer met à jour les entrées existantes sans créer de doublons.
