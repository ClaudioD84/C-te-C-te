# Tests de bout en bout

Ils pilotent la **version web** de l'application dans Chromium (format téléphone), contre une **vraie pile
Supabase locale** : base, règles d'accès (RLS), authentification et stockage. Les fonctions serveur tournent avec
le Deno du dépôt. Les services externes sont simulés (`support/mocks.mjs`) : API Claude (réponses fixes selon le
schéma demandé), envoi d'e-mails Brevo ; les achats passent par le mode simulé. Aucun appel payant n'est fait.

## Lancer les tests

```bash
pnpm exec supabase start -x studio,imgproxy,logflare,vector,supavisor,postgres-meta,edge-runtime,mailpit,realtime
pnpm e2e:build      # exporte la version web reliée à la pile de test (à refaire après une modification de l'app)
pnpm test:e2e       # démarre fonctions, services factices et serveur web, puis lance les tests
```

Prérequis : Docker, `psql` (client PostgreSQL) et Chromium pour Playwright
(`pnpm --filter e2e exec playwright install chromium`).

Options utiles : `pnpm test:e2e --ui` (mode interactif), `pnpm test:e2e tests/profil.spec.ts` (un seul fichier).
En cas d'échec, la trace et la capture d'écran sont dans `e2e/test-results`.

## Ce qui est couvert

| Fichier                       | Parcours                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parcours.spec.ts`            | Profil avec consentement, planning, fiches générées, signalement, console enfant (activité, quiz, cartes), code parent, suivi, dossier de révision                         |
| `hors-connexion.spec.ts`      | Mission du jour hors connexion, fermeture de l'app, synchronisation au retour du réseau sans doublon                                                                       |
| `abonnement.spec.ts`          | Essai gratuit, achat simulé, limite d'enfants de la formule Solo                                                                                                           |
| `profil.spec.ts`              | Modification du profil, nouveau consentement, retrait du consentement, suppression                                                                                         |
| `accessibilite.spec.ts`       | Audit WCAG 2.2 AA (axe) des écrans principaux, thèmes clair et sombre                                                                                                      |
| `serveur.spec.ts`             | Analyse d'une photo (tâches extraites, photo supprimée), cloisonnement entre familles, purge des comptes inactifs                                                          |
| `plusieurs-documents.spec.ts` | Plusieurs photos en un envoi : pages d'un même document lues ensemble, documents distincts relus un par un, photos effacées                                                |
| `planning-modifiable.spec.ts` | Planning réglé par le parent : répartition régulière ou près des échéances, retouches (déplacer, allonger, retirer, ajouter), planning publié retouché, priorités et dates |

## Architecture

- `support/stack.mjs` : services factices (port 5300), une fonction Deno par dossier de `supabase/functions`,
  et une passerelle (port 54320) qui envoie `/functions/v1/*` aux fonctions et le reste à Supabase (54321).
- `support/static.mjs` : sert `e2e/.web` sur le port 8765.
- `support/functions.env` : secrets factices des fonctions.
- Les tests préparent certaines données directement en SQL (`helpers.ts`), par exemple les tâches qu'aurait
  produites l'analyse d'une photo, la caméra n'étant pas disponible dans le navigateur de test.
