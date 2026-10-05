# Référentiels FWB

Les référentiels officiels sont publiés en PDF sur enseignement.be. Ce dossier les transforme en données
pour la table `curriculum_item` (fonctionnalité F2).

## État actuel

| Fichier | Référentiel (tronc commun) | Années | Mode de `decouper.py` |
|---|---|---|---|
| `donnees/mat-2020.json` | Compétences initiales (maternelle, 8 disciplines) | M1-M2, M3 | `maternelle` |
| `donnees/ma-2022.json` | Mathématiques | P1 → S3 | `champs` |
| `donnees/fr-2022.json` | Français et Langues anciennes | P1 → S3 | `generique` (+ étiquettes ignorées) |
| `donnees/sc-2022.json` | Sciences | P1 → S3 | `generique` |
| `donnees/lm-2022.json` | Langues modernes | P3 → S3 | `generique` |
| `donnees/hg-2022.json` | Formation historique, géographique, économique et sociale | P1 → S3 | `colonnes` |

Tout se régénère avec `scripts/referentiels/regenerer.sh <dossier des PDF>` (puis le SQL d'import).
En maternelle, les attendus « M1-M2 » sont ceux de fin de 2e maternelle ; ils sont associés à M1 et M2.

Les intitulés sont recopiés mot pour mot depuis les PDF officiels publiés sur
[enseignement.be](https://www.enseignement.be/parcours-dapprentissage/maternel-et-primaire-ordinaire/organisation-de-lenseignement-maternel-et-primaire/contenus-dapprentissage).
La découpe automatique peut couper un attendu en deux sur un saut de page ou rattacher un attendu
au mauvais savoir : **une relecture reste nécessaire** avant la sortie publique.

Pas encore importés : éducation physique, éducation culturelle et artistique, philosophie et citoyenneté
et formation manuelle et technique en primaire et secondaire ; compétences terminales des 2e et 3e degrés.

## 0. Découper un PDF sans IA (recommandé quand la mise en page est reconnue)

```bash
python3 scripts/referentiels/decouper.py chemin/2022_REF_Mathematiques.pdf \
  --matiere "Mathématiques" --prefixe MA --version 2022 \
  --titre "Référentiel de Mathématiques (tronc commun)" --url "https://www.enseignement.be/..." \
  > scripts/referentiels/donnees/ma-2022.json
```

Nécessite `pdftotext` (paquet poppler-utils). Deux modes : `champs` (référentiels organisés en
« CHAMP n » et sections numérotées, comme les mathématiques) et `generique` (tableaux à deux colonnes).

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
