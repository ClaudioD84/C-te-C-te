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
| `supabase` | Configuration, migrations SQL (schéma, sécurité RLS, stockage) |
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

## Vérifications

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # Tests unitaires (packages/shared)
```

La CI GitHub Actions exécute ces vérifications et applique les migrations Supabase sur une base vierge.

## État du projet

Étape 1 en cours. Déjà en place : comptes parents, profils enfants avec pseudonyme et besoins particuliers (avec consentement), console enfant avec minuteur Pomodoro adapté au profil, schéma de base de données sécurisé.
