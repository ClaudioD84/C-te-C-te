# Banc d'essai de l'IA

Mesure, sur des cas de référence, la qualité et le coût de la lecture des photos et de la préparation des fiches,
pour choisir le modèle et l'effort **sur des faits** (Opus 5.5, Sonnet 5.5 deux fois moins cher, Haiku 5.5 environ
40 fois moins cher…). Le banc appelle **le même code que la production** (`extractTasksFromImage`,
`generatePackFromRequest`) avec les mêmes variables d'environnement.

## Vérifier le banc gratuitement (aucun appel à l'IA)

```bash
pnpm banc-ia --simulation oracle   # réponses parfaites : tout doit être à 100 %
pnpm banc-ia --simulation nul      # réponses vides : rappel et fiches à 0 %
```

## Lancer un vrai passage

```bash
export ANTHROPIC_API_KEY=...                                  # votre clé (jamais commitée)
pnpm banc-ia --repetitions 3                                  # modèles actuels (photos Opus 5.5, fiches Sonnet 5.5)
SCAN_MODEL=claude-sonnet-5-5 pnpm banc-ia --photos --repetitions 3 --nom sonnet
PACK_MODEL=claude-opus-5-5 pnpm banc-ia --fiches --juge --nom fiches-opus  # fiches sur Opus, pour comparer
SCAN_EFFORT=medium pnpm banc-ia --photos --nom opus-medium    # seulement les photos
pnpm banc-ia --fiches --juge                                   # fiches notées par un juge (Opus 5.5)
```

Chaque passage coûte de l'argent : le coût réel est affiché dans le rapport (tokens facturés par l'API). À titre
indicatif, une photo coûte quelques centimes et une fiche un peu plus ; le juge double à peu près le coût des
fiches. Commencez par 1 passage sur quelques cas.

Le rapport (`resultats/<date>-<nom>/synthese.md`) donne :

- **photos** : devoirs retrouvés (rappel), devoirs lus qui sont justes (précision), dates justes, mots de dictée
  et vocabulaire retrouvés, coût moyen, temps médian ;
- **fiches** : fiches complètes (contrôle sans IA) et, avec `--juge`, une note sur 5 (exactitude, niveau,
  couverture, adaptations, clarté) avec les erreurs de fond relevées, à vérifier vous-même ;
- les essais **non notés** à part (refus, réponse d'un autre modèle, délai, réponse tronquée ou illisible, panne) :
  une panne n'est jamais comptée comme une mauvaise réponse.

Avec plusieurs passages, chaque mesure donne la moyenne et l'écart entre passages : une différence plus petite que
cet écart n'est pas significative.

## Ajouter vos cas

**Vos vraies photos vont dans `cas-prives/`** (ignoré par git : elles ne quittent pas votre ordinateur, sauf vers
l'IA pendant le passage, comme en production). Même format que `cas/` :

- `cas-prives/photos/<nom>.jpg` : la photo (JPEG) ;
- `cas-prives/photos/<nom>.json` : ce qu'une personne lit sur la page.

```json
{
  "id": "journal-lea-12-octobre",
  "grade": "P5",
  "documentType": "journal_de_classe",
  "today": "2026-10-12",
  "tasks": [
    {
      "subject": "Mathématiques",
      "kind": "devoir",
      "keywords": ["exercices", "34"],
      "dueDate": "2026-10-13"
    },
    { "subject": "Éveil", "kind": "interro", "keywords": ["fleuves"], "dueDate": "2026-10-16" }
  ],
  "spellingWords": ["le château", "une forêt"]
}
```

- `subject` : nom complet de la matière (« Mathématiques », « Néerlandais », « Éveil »…) ;
- `kind` : `devoir`, `lecon`, `interro` ou `examen` ;
- `keywords` : 1 à 3 mots qui doivent figurer dans la consigne lue (sans accents ni majuscules à respecter) ;
- `dueDate` : la date attendue, `null` si la page n'en donne pas, ou absente pour ne pas la vérifier ;
- `today` : la date du jour où la photo a été prise (les « pour jeudi » sont calculés à partir d'elle) ;
- `spellingWords`, `vocabulary` : seulement pour une dictée ou une liste de vocabulaire.

Écrivez ces réponses **vous-même, depuis la photo** (pas à partir d'une réponse de l'IA : on mesurerait alors
l'imitation d'un modèle). Visez 20 à 30 photos variées : écritures difficiles, pages chargées, dictées corrigées,
listes de vocabulaire, notes de cours, pages sans devoir.

Pour les fiches, ajoutez `cas-prives/fiches.json` (même format que `cas/fiches.json`) avec les tâches réelles qui
comptent pour vous ; `curriculum` (facultatif) reprend des attendus du programme.
