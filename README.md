# Côte à Côte

Assistant pédagogique pour les familles de la Fédération Wallonie-Bruxelles : le parent photographie le journal de classe, l'application organise la semaine et propose un travail adapté au profil de l'enfant (y compris TDAH, dyslexie, dyscalculie).

## Documentation

- [Cahier des charges](docs/cahier-des-charges.md) — vision, fonctionnalités, étapes de livraison, modèle économique
- [Architecture technique](docs/architecture.md) — choix techniques, modèle de données, circuit des photos, IA, RGPD
- [Dossier RGPD](docs/rgpd/README.md) — registre, analyse d'impact, politique de confidentialité, déclarations des stores, plan d'action
- [Publication sur les stores](docs/publication/README.md) — fiches, captures, notes de revue, étapes de soumission
- [Revue de sécurité](docs/securite.md) — constats, corrections et réglages de production
- [Essayer l'application sur son ordinateur](docs/demo.md) — `pnpm demo` : serveur local, IA simulée, compte de démonstration

## Organisation du dépôt

| Dossier                | Contenu                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/mobile`          | Application Expo (iPhone, Android, tablettes)                                                    |
| `packages/shared`      | Schémas, règles d'adaptation au profil, minuteur Pomodoro (code partagé et testé)                |
| `e2e`                  | Tests de bout en bout (Playwright, pile Supabase locale)                                         |
| `supabase`             | Configuration, migrations SQL (schéma, sécurité RLS, stockage), fonctions serveur (`functions/`) |
| `scripts/referentiels` | Structuration et import des référentiels officiels FWB                                           |
| `scripts/culture`      | Base de contenus culturels vérifiés (« pour aller plus loin »)                                   |
| `docs`                 | Cahier des charges et architecture                                                               |

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

Les achats intégrés réels (RevenueCat) demandent un **build de développement** :
`npx eas-cli@latest build --profile development` (ou `npx expo run:android` / `npx expo run:ios`). Dans Expo Go,
l'abonnement passe par le mode simulé.

## Bêta privée

Version web en ligne (`pnpm deploy:web`), codes d'invitation et suivi des testeurs (`pnpm beta`) :
[docs/beta/README.md](docs/beta/README.md). À envoyer aux familles : [guide du testeur](docs/beta/guide-testeur.md).

## Mettre en ligne le serveur

1. Créer un projet sur [supabase.com](https://supabase.com) dans la région **Europe (Frankfurt)**.
2. Relier le dépôt et appliquer les migrations : `pnpm exec supabase link --project-ref <ref>` puis
   `pnpm exec supabase db push --include-seed` (sans `--include-seed`, les référentiels du programme et les
   contenus culturels de `supabase/seed` ne sont pas chargés ; relancer est sans risque).
3. Ajouter la clé de l'API Claude : `pnpm exec supabase secrets set ANTHROPIC_API_KEY=...`
   (facultatif : `SCAN_MODEL`, `SCAN_EFFORT`, `PACK_MODEL`, `PACK_EFFORT` pour régler le modèle et l'effort
   de la lecture des photos et de la préparation des fiches).
4. Déployer les fonctions : `pnpm exec supabase functions deploy scan-extract generate-pack explain-again revision-plan delete-account pair-device revenuecat-webhook purge-photos purge-inactive weekly-recap notify-parents` (jamais `simulate-purchase` en production).
5. Renseigner l'adresse et la clé publique du projet dans `apps/mobile/.env.local`.
6. Abonnements :
   - créer les produits dans App Store Connect et Google Play Console (`cac_solo_mois`, `cac_famille_mois`,
     `cac_solo_annee`, `cac_famille_annee`) ;
   - dans RevenueCat : les droits `solo` et `famille`, une offre courante avec les quatre produits, puis un
     webhook vers `https://<ref>.supabase.co/functions/v1/revenuecat-webhook` avec un en-tête
     d'autorisation secret ;
   - `pnpm exec supabase secrets set REVENUECAT_WEBHOOK_SECRET=... REVENUECAT_SECRET_API_KEY=...`
     (et `REVENUECAT_ALLOW_SANDBOX=true` pendant la bêta) ;
   - clés publiques RevenueCat et liens des conditions et de la politique de confidentialité dans
     `apps/mobile/.env.local` (voir `.env.example`).
7. Tâches programmées (purges et bilan de la semaine) : elles sont créées par les migrations (pg_cron). Il reste
   à choisir un secret, `pnpm exec supabase secrets set PURGE_SECRET=...`, puis à le ranger avec l'adresse du
   projet dans le coffre de Supabase (éditeur SQL, une seule fois) :
   `select vault.create_secret('https://<ref>.supabase.co', 'project_url');` et
   `select vault.create_secret('<même valeur que PURGE_SECRET>', 'purge_secret');`.
   Vérification : `select * from cron.job_run_details order by start_time desc limit 5;`.
   La purge des photos passe toutes les heures (aucune photo ne reste plus de 24 heures).
8. Conservation des données : la tâche nocturne `purge-inactive` efface le journal de l'effort de plus de 2 ans
   et, pour les comptes inactifs depuis 24 mois, envoie un e-mail d'avertissement puis supprime le compte 30 jours plus tard sans reconnexion (jamais pendant un
   abonnement payé en cours). Les e-mails passent par Brevo (prestataire européen) :
   `pnpm exec supabase secrets set BREVO_API_KEY=... EMAIL_FROM=...` (adresse d'expéditeur validée chez Brevo).
   Tant que ces secrets manquent, aucun compte n'est averti ni supprimé.
9. E-mails de connexion (confirmation, mot de passe oublié) : modèles français de `supabase/templates` à recopier
   dans Supabase > Authentication > Email Templates (voir docs/beta/testflight.md). Envoi : Supabase >
   Authentication > Emails > SMTP Settings, avec les identifiants SMTP de Brevo (serveur
   `smtp-relay.brevo.com`, port 587, identifiant et clé SMTP indiqués dans Brevo > SMTP & API), la même adresse
   d'expéditeur, et relever la limite d'envoi par heure.

## Mises à jour des dépendances

Dependabot propose chaque lundi une mise à jour groupée des bibliothèques (versions mineures), vérifiée par la CI.
Les paquets du SDK Expo (expo, react-native…) se mettent à jour ensemble : `cd apps/mobile && npx expo install
--fix`, ou lors du passage au SDK suivant. Les fonctions serveur fixent leurs versions dans
`supabase/functions/_shared/deps.ts`.

## Vérifications

```bash
pnpm lint               # ESLint
pnpm typecheck          # TypeScript
pnpm test               # Tests unitaires (packages/shared)
pnpm test:functions     # Tests des fonctions serveur (Deno)
pnpm check:functions    # Types des fonctions et des scripts
pnpm format:check       # Mise en forme (Prettier)
pnpm test:e2e           # Tests de bout en bout (voir e2e/README.md)
```

La CI GitHub Actions exécute ces vérifications et applique les migrations Supabase sur une base vierge.

## État du projet

Étape 1 presque terminée. En place :

- comptes parents, profils enfants avec pseudonyme et besoins particuliers (avec consentement) ;
- code parent et console enfant verrouillée ;
- photo du journal de classe, lecture par Claude (sans recopier les noms), validation par le parent ; plusieurs
  pages par document (5 au plus, lues ensemble) et plusieurs documents par envoi (6 au plus), relus un par un ;
- fiches, quiz et exercices adaptés à l'année et à la filière (registre, types de questions, quantités ; langue étudiée
  au niveau visé en langue moderne au secondaire) ; console de l'enfant ludique ou sobre (par défaut au secondaire) ;
- planning de la semaine (ou de deux semaines) avec alertes de surcharge, réglé et retouché par le parent : répartition
  régulière ou près des échéances, temps par jour, priorité et échéance de chaque tâche, activités à déplacer,
  raccourcir, retirer ou ajouter ; mission du jour, Pomodoro, lecture vocale ;
- export et suppression du compte (RGPD) ;
- rappels (mission du jour, évaluations, planning, photos à vérifier), avec heures calmes ;
- console enfant utilisable hors connexion : mission, fiches et cartes gardées sur l'appareil, actions envoyées au retour du réseau ;
- outillage d'import des référentiels officiels et écran « Programme de l'année ».

Abonnement en place (écran des formules, achats App Store et Google Play via RevenueCat, mise à jour par webhook,
mode simulé pour les tests) ; reste à créer les comptes et produits dans les stores et RevenueCat.

Référentiels importés : tout le tronc commun, de M1 à S3 (10 998 entrées), et les compétences terminales du
secondaire, S3/S4 à S6/S7, selon la filière (9 364 entrées) ; voir `scripts/referentiels/README.md`.

Étape 2 en cours. En place :

- fiche de synthèse, quiz, exercices et cartes préparés par Claude pour chaque leçon ou évaluation, à la
  demande (console de l'enfant, 3 jours d'avance, ou à l'ouverture ; toute la semaine pour l'impression) et au
  niveau des documents de l'enseignant (questions relevées sur les interrogations et les notes du même cours) ;
  listes de vocabulaire photographiées complétées d'un quiz, d'exercices et de cartes de phrases ; signalement
  d'erreur et régénération par le parent ;
- cartes de révision à répétition espacée, ramenées avant la date de l'évaluation ;
- chaque leçon en trois étapes : je revois (fiche et « clés pour réussir »), je m'entraîne (questions à choix
  puis réponses à taper, sans correction), je vérifie (chaque réponse comparée à la réponse attendue ; accents,
  article d'une langue, unité ou petite faute : « presque », l'enfant corrige une fois avec un indice) ;
  résultat dans le suivi ;
- cartes : l'enfant tape la réponse (vérifiée) ou la dit à voix haute pour une réponse longue ;
- interrogation corrigée photographiée : les notions ratées et leurs erreurs (sans la note) deviennent une fiche
  de remédiation (rappel ciblé sur ses erreurs, exercices guidés pas à pas puis en autonomie) ;
- export « Print & Go » : PDF accessible (Lexend, grands espacements, réponses sur une page séparée) ;
- police Lexend dans l'application pour les profils dyslexie ;
- compétences terminales du secondaire supérieur, filtrées selon la filière de l'enfant (transition ou qualification).

Étape 3 en cours. En place :

- gamification éthique : points d'effort, avatar qui grandit, badges de régularité et de persévérance ;
- dossiers de révision (CEB, CE1D, CESS, bilans) : thèmes proposés par Claude, relus par le parent,
  étalés jusqu'à l'épreuve ;
- écran Suivi : indicateurs de la semaine, minutes par semaine, épreuves à venir, travail à rattraper ;
- structure de l'enrichissement culturel (base de contenus vérifiés, suggestions selon l'année et les matières).

Reste pour l'étape 3 : relire les 145 contenus culturels proposés (`scripts/culture/a-relire.csv`).
