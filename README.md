# Côte à Côte

Assistant pédagogique pour les familles de la Fédération Wallonie-Bruxelles : le parent photographie le journal de classe, l'application organise la semaine et propose un travail adapté au profil de l'enfant (y compris TDAH, dyslexie, dyscalculie).

## Documentation

- [Cahier des charges](docs/cahier-des-charges.md) — vision, fonctionnalités, étapes de livraison, modèle économique
- [Architecture technique](docs/architecture.md) — choix techniques, modèle de données, circuit des photos, IA, RGPD

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `apps/mobile` | Application Expo (iPhone, Android, tablettes) |
| `packages/shared` | Schémas, règles d'adaptation au profil, minuteur Pomodoro (code partagé et testé) |
| `supabase` | Configuration, migrations SQL (schéma, sécurité RLS, stockage), fonctions serveur (`functions/`) |
| `scripts/referentiels` | Structuration et import des référentiels officiels FWB |
| `scripts/culture` | Base de contenus culturels vérifiés (« pour aller plus loin ») |
| `docs` | Cahier des charges et architecture |

## Démarrer en local

Prérequis : Node.js 22, pnpm 10, Docker (pour Supabase en local), l'application **Expo Go** ou un build de développement sur un téléphone.

```bash
pnpm install

# Base de données locale (applique les migrations)
pnpm exec supabase start
# → noter « API URL » et « Publishable key » affichés

# Configuration de l'application
cp apps/mobile/.env.example apps/mobile/.env.local
# → renseigner EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

pnpm mobile
```

La prise de photo avec masquage automatique des noms (ML Kit) et le dessin des masques (Skia) demandent un
**build de développement** : `npx eas-cli@latest build --profile development` (ou `npx expo run:android` /
`npx expo run:ios`). Dans Expo Go, le masquage se fait à la main.

## Mettre en ligne le serveur

1. Créer un projet sur [supabase.com](https://supabase.com) dans la région **Europe (Frankfurt)**.
2. Relier le dépôt et appliquer les migrations : `pnpm exec supabase link --project-ref <ref>` puis `pnpm exec supabase db push`.
3. Ajouter la clé de l'API Claude : `pnpm exec supabase secrets set ANTHROPIC_API_KEY=...`
   (facultatif : `SCAN_MODEL`, `SCAN_EFFORT`, `PACK_MODEL`, `PACK_EFFORT` pour régler le modèle et l'effort
   de la lecture des photos et de la préparation des fiches).
4. Déployer les fonctions : `pnpm exec supabase functions deploy scan-extract generate-pack revision-plan delete-account`.
5. Renseigner l'adresse et la clé publique du projet dans `apps/mobile/.env.local`.

## Vérifications

```bash
pnpm lint               # ESLint
pnpm typecheck          # TypeScript
pnpm test               # Tests unitaires (packages/shared)
pnpm test:functions     # Tests des fonctions serveur (Deno)
pnpm check:functions    # Types des fonctions et des scripts
pnpm format:check       # Mise en forme (Prettier)
```

La CI GitHub Actions exécute ces vérifications et applique les migrations Supabase sur une base vierge.

## État du projet

Étape 1 presque terminée. En place :

- comptes parents, profils enfants avec pseudonyme et besoins particuliers (avec consentement) ;
- code parent et console enfant verrouillée ;
- photo du journal de classe, masquage des noms sur l'appareil, lecture par Claude, validation par le parent ;
- planning de la semaine avec alertes de surcharge, mission du jour, Pomodoro, lecture vocale ;
- export et suppression du compte (RGPD) ;
- outillage d'import des référentiels officiels et écran « Programme de l'année ».

Reste pour l'étape 1 : l'abonnement (RevenueCat, App Store, Google Play).

Référentiels importés : maternelle (8 disciplines), mathématiques, français, sciences, langues modernes et
formation historique, géographique, économique et sociale (tronc commun, M1 → S3) ; voir `scripts/referentiels/README.md`.

Étape 2 en cours. En place :

- fiche de synthèse, quiz, exercices et cartes préparés par Claude pour chaque leçon ou évaluation,
  dès la publication du planning ; signalement d'erreur et régénération par le parent ;
- cartes de révision à répétition espacée, ramenées avant la date de l'évaluation ;
- export « Print & Go » : PDF accessible (Lexend, grands espacements, réponses sur une page séparée) ;
- police Lexend dans l'application pour les profils dyslexie.

Reste pour l'étape 2 : les autres disciplines du tronc commun en primaire et secondaire ; les compétences
terminales des 2e et 3e degrés du secondaire.

Étape 3 en cours. En place :

- gamification éthique : points d'effort, avatar qui grandit, badges de régularité et de persévérance ;
- dossiers de révision (CEB, CE1D, CESS, bilans) : thèmes proposés par Claude, relus par le parent,
  étalés jusqu'à l'épreuve ;
- écran Suivi : indicateurs de la semaine, minutes par semaine, épreuves à venir, travail à rattraper ;
- structure de l'enrichissement culturel (base de contenus vérifiés, suggestions selon l'année et les matières).

Reste pour l'étape 3 : constituer la base de contenus culturels vérifiés.
