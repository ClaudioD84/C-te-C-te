# Bêta privée : mise en place

Objectif : des familles testent Côte à Côte en touchant un simple lien, sans rien installer, puis via TestFlight et
le test interne Google Play quand les comptes des stores sont ouverts.

## 1. Ce qu'il faut une seule fois

| Élément | Où | Pourquoi |
|---|---|---|
| Projet Supabase **région UE (Francfort)** | supabase.com | Base, comptes, photos, fonctions serveur |
| Clé API Anthropic | console.anthropic.com | Lecture des photos et préparation des fiches |
| Compte Expo (gratuit) | expo.dev | Hébergement de la version web (EAS Hosting) et builds |
| Compte Brevo | brevo.com | E-mails de confirmation de compte (voir docs/publication) |

Mise en place du serveur : suivre « Mettre en ligne le serveur » du README principal (migrations, fonctions,
secrets). Puis, dans Supabase > Authentication > URL Configuration : **Site URL** = l'adresse de la version web
(par exemple `https://cote-a-cote.expo.app`), pour que le lien de confirmation de l'e-mail y ramène.

## 2. Mettre la version web en ligne

1. Dans `apps/mobile/.env` (jamais commité) :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<projet>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clé publique>
   EXPO_PUBLIC_PAYMENTS_SIMULATION=false
   ```
2. `npx eas-cli@latest login`, puis à la racine : `pnpm deploy:web`. La première fois, EAS demande le nom du site.
3. L'adresse affichée (`https://<nom>.expo.app`) est celle à envoyer aux familles. Chaque nouvelle
   `pnpm deploy:web` met tout le monde à jour en une minute, sans rien réinstaller.

La version web n'a ni notifications de rappel ni achats : les testeurs utilisent l'**essai offert par leur code**
(90 jours par défaut). Le reste (photo, planning, console de l'enfant, cartes, dictée…) est identique.

## 3. Inviter les familles

Avec la clé de service du projet (Supabase > Project Settings > API, **jamais** dans l'application) :

```
export SUPABASE_URL=https://<projet>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clé de service>
pnpm beta code FAMILLE-01 1 90 "première famille"   # 1 inscription, 90 jours d'essai
pnpm beta code ECOLE-2026 20 90 "école du quartier" # 20 inscriptions
pnpm beta codes                                     # utilisations
```

Dès qu'un code existe, l'inscription en demande un. Le deuxième parent d'une famille s'inscrit avec un code
(le même s'il reste des utilisations), puis rejoint la famille avec l'invitation de « Mon compte ».
Pour le lancement public : supprimer les codes (table `invite_code`), l'inscription redevient libre.

Envoyer à chaque famille le lien, son code et le [guide du testeur](guide-testeur.md).

## 4. Suivre la bêta

```
pnpm beta stats      # par famille : photos, tâches, missions, jours actifs, avis, coût IA (30 jours)
pnpm beta avis       # messages « Donner mon avis » (14 jours), avec l'écran d'origine
pnpm beta erreurs    # plantages regroupés par message (7 jours)
```

Repères utiles pour les partenaires : part des familles actives au moins 3 jours par semaine, missions terminées
par enfant et par semaine, coût IA moyen par famille et par mois.

## 5. Ensuite : TestFlight et Google Play

Quand les comptes Apple Developer et Google Play sont ouverts : `docs/publication/README.md` (build
`production`, TestFlight pour les testeurs externes, test interne Google Play). Les mêmes codes d'invitation
servent ; les notifications de rappel et les achats en bac à sable deviennent testables.
