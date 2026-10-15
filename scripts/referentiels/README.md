# Référentiels FWB

Les référentiels officiels sont publiés en PDF sur enseignement.be. Ce dossier les transforme en données
pour la table `curriculum_item` (fonctionnalité F2).

## État actuel

| Fichier                 | Référentiel (tronc commun)                                | Années    | Mode de `decouper.py`               |
| ----------------------- | --------------------------------------------------------- | --------- | ----------------------------------- |
| `donnees/mat-2020.json` | Compétences initiales (maternelle, 8 disciplines)         | M1-M2, M3 | `maternelle`                        |
| `donnees/ma-2022.json`  | Mathématiques                                             | P1 → S3   | `champs`                            |
| `donnees/fr-2022.json`  | Français et Langues anciennes                             | P1 → S3   | `generique` (+ étiquettes ignorées) |
| `donnees/sc-2022.json`  | Sciences                                                  | P1 → S3   | `generique`                         |
| `donnees/lm-2022.json`  | Langues modernes                                          | P3 → S3   | `generique`                         |
| `donnees/hg-2022.json`  | Formation historique, géographique, économique et sociale | P1 → S3   | `colonnes`                          |
| `donnees/ep-2022.json`  | Éducation physique et à la santé                          | P1 → S3   | `generique --sans-intertitres`      |
| `donnees/ea-2022.json`  | Éducation culturelle et artistique                        | P1 → S3   | `generique --sans-intertitres`      |
| `donnees/pc-2022.json`  | Éducation à la philosophie et à la citoyenneté            | P1 → S3   | `generique --sans-intertitres`      |
| `donnees/mt-2022.json`  | Formation manuelle, technique, technologique et numérique | P1 → S3   | `generique --sans-intertitres`      |

### Compétences terminales du secondaire (S3/S4 → S6/S7)

`decouper_ct.py` (PyMuPDF : `pip install pymupdf`) lit les 24 référentiels publiés sur la page
[Contenus d'apprentissage du secondaire](https://www.enseignement.be/parcours-dapprentissage/secondaire-ordinaire/organisation/contenus-dapprentissage)
et produit `donnees/ct-*.json` : 402 compétences, 8 938 attendus.

| Format                                                                                   | Fichiers                                                                                                                                                                                                                                 | Lecture                                                                                  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Fiches « UAA » (2014-2023) : compétences, appliquer / transférer / connaître, ressources | mathématiques, sciences (éducation scientifique, sciences de base, sciences générales, formation scientifique), français, géographie, histoire-géo et formation économique et sociale (qualification), EPC, arts du cirque, informatique | `fiches_uaa.py` (colonnes repérées par position)                                         |
| Niveaux du CECRL (2017)                                                                  | langues modernes (transition et qualification)                                                                                                                                                                                           | `langues_ct.py` : énoncé de la compétence, fonctions langagières, répertoire grammatical |
| Listes (1999-2004)                                                                       | histoire, latin-grec, sciences économiques et sociales, éducation physique (et option), éducation artistique, éducation technique et technologique, technologie                                                                          | `anciens_ct.py`                                                                          |

Choix à connaître :

- **Filières** : chaque fichier indique ses types d'enseignement (`tracks`) ; l'application filtre selon celui de
  l'enfant. Transition = général, technique (de transition) et spécialisé ; qualification = technique,
  professionnel et spécialisé. Le tronc commun vaut pour tous.
- **Années** : « 2e degré » → S3 et S4, « 3e degré » → S5 et S6 (et S7 en qualification) ; une année précise
  quand la fiche la donne (mathématiques, sciences, informatique, arts du cirque). Les élèves de 3e qui suivent
  encore l'ancien régime (avant l'arrivée du tronc commun en S3) voient donc aussi ces compétences.
- **Langues modernes** : une fiche par niveau (A1+, A2, B1, B2) et par compétence ; le niveau visé dépend de la
  langue (LM1, LM2, LM3) et du degré, il figure dans l'intitulé et le parent choisit.
- **Matières** : rangées dans les 9 matières de l'application (latin-grec avec le français, sciences économiques
  et formation économique et sociale avec l'histoire-géo, informatique et technologie avec la formation manuelle
  et technique, arts du cirque avec l'éducation culturelle et artistique).
- **Non repris** : les tableaux de savoirs par secteur du référentiel de technologie (2004), les exemples
  d'auteurs du référentiel d'EPC et les UAA de 7e professionnelle qu'il cite sans les retenir, les tableaux
  de caractéristiques des langues modernes.

Tout se régénère avec `scripts/referentiels/regenerer.sh <dossier des PDF>` (puis le SQL d'import).
En maternelle, les attendus « M1-M2 » sont ceux de fin de 2e maternelle ; ils sont associés à M1 et M2.

Les intitulés sont recopiés mot pour mot depuis les PDF officiels publiés sur
[enseignement.be](https://www.enseignement.be/parcours-dapprentissage/maternel-et-primaire-ordinaire/organisation-de-lenseignement-maternel-et-primaire/contenus-dapprentissage).
En maternelle, la lecture s'arrête au chapitre « 5. Visées transversales » : la suite (visées transversales et
tableaux de croisements sur plusieurs colonnes) n'est pas une liste d'attendus. `donnees.test.ts` vérifie
qu'aucun attendu, dans aucun référentiel, ne contient de texte mélangé de plusieurs colonnes.

La découpe automatique peut couper un attendu en deux sur un saut de page ou rattacher un attendu
au mauvais savoir : **une relecture reste nécessaire** avant la sortie publique.

Tous les référentiels du tronc commun (10 998 entrées) et les compétences terminales du secondaire
(9 364 entrées) sont importés.

Le référentiel d'éducation culturelle et artistique cite de nombreuses œuvres, artistes et lieux par année :
une bonne source pour constituer la base de contenus culturels (`scripts/culture`).

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
