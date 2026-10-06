# Publication sur l'App Store et Google Play

Tout ce qui est prêt dans le dépôt, et ce qu'il reste à faire de votre côté, dans l'ordre.

| Document | Contenu |
|---|---|
| [fiche-stores.md](fiche-stores.md) | Nom, sous-titre, descriptions, mots-clés (limites vérifiées par `verifier-fiches.mjs`) |
| [notes-de-revue.md](notes-de-revue.md) | Notes et compte de démonstration pour les équipes de revue d'Apple et de Google |
| [captures/](captures/) | Captures iPhone 6,9", iPad 13" et Android, régénérables avec `pnpm --filter e2e captures` |
| [../rgpd/declarations-stores.md](../rgpd/declarations-stores.md) | Réponses « App Privacy » (Apple) et « Sécurité des données » (Google) |

## Déjà prêt dans l'application

- Identifiants : `be.coteacote.app` (iOS et Android), version 1.0.0, numéros de build gérés par EAS.
- Textes d'autorisation en français (appareil photo ; photothèque via le sélecteur du système, sans accès à toute
  la photothèque ; notifications ; micro pour « Je récite », demandé seulement au premier enregistrement).
- Android : autorisations limitées (micro pour « Je récite » ; pas d'accès à toutes les photos, pas de
  superposition). L'enregistrement reste sur l'appareil : rien à déclarer comme donnée collectée (« Audio »
  non collecté), mais le micro doit être justifié dans la fiche si Google le demande.
- iOS : manifeste de confidentialité (aucun suivi, motifs d'utilisation des API déclarés), chiffrement standard
  déclaré (pas de question d'export à chaque envoi), langue française.
- Exigences des stores : suppression du compte dans l'application, liens conditions et confidentialité sur
  l'écran d'abonnement, mention du renouvellement automatique, restauration des achats.
- Profils de compilation EAS (`apps/mobile/eas.json`) : `development`, `preview` (installation directe, APK
  Android) et `production` ; envoi Android vers le test interne, en brouillon.

## Chaque année

- **Calendrier scolaire** : vérifier les dates 2026-2027 sur enseignement.be (elles viennent de la presse) et
  ajouter l'année suivante dans `packages/shared/src/school-calendar.ts` avant la fin de l'année en cours.

## Bloquant avant la première soumission

1. **Icône et écran de démarrage** : ce sont encore ceux du modèle Expo. Il faut une icône 1024 × 1024 (sans
   transparence pour iOS), les calques de l'icône adaptative Android et l'image de l'écran de démarrage
   (`apps/mobile/assets`). C'est l'identité visuelle à choisir (question ouverte du cahier des charges).
2. **URLs publiques** de la politique de confidentialité et des conditions d'utilisation (exigées par les deux
   stores et affichées dans l'application : `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`), et une adresse
   de support.
3. **Comptes** : Apple Developer Program (99 $ par an), Google Play Console (25 $), Expo, RevenueCat, projet
   Supabase de production, Brevo.

> **Compte Google Play personnel ou organisation ?** Un compte *personnel* récent doit mener un test fermé avec
> au moins 12 testeurs pendant 14 jours avant de pouvoir publier. Un compte *organisation* (société, numéro
> D-U-N-S) en est dispensé et affiche le nom de la société comme éditeur. Même question chez Apple (nom affiché).

## Étapes

### 1. Expo et EAS

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init          # crée le projet EAS et ajoute son identifiant à app.json
```

Variables de l'environnement `production` (expo.dev > projet > Environment variables) :
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`,
`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, et
`EXPO_PUBLIC_PAYMENTS_SIMULATION=false`. Pour `preview` (bêta), les mêmes, éventuellement avec un projet Supabase
de préproduction.

### 2. App Store Connect

1. Accepter le contrat des apps payantes, renseigner banque et fiscalité (sans cela, pas d'abonnement).
2. Créer l'app : nom « Côte à Côte », langue principale français, identifiant `be.coteacote.app`.
3. Abonnements : un groupe « Côte à Côte » avec `cac_solo_mois`, `cac_famille_mois`, `cac_solo_annee`,
   `cac_famille_annee` (prix de [fiche-stores.md](fiche-stores.md)), puis les relier à RevenueCat.
4. Fiche : textes de [fiche-stores.md](fiche-stores.md), captures `captures/iphone` et `captures/ipad`, catégorie
   **Éducation** (secondaire : Productivité), URLs de confidentialité et de support.
5. Confidentialité de l'app : réponses de [declarations-stores.md](../rgpd/declarations-stores.md).
6. Classification par âge : aucun contenu sensible, pas de navigateur web libre, pas de contenu généré par
   d'autres utilisateurs → **4+**. Ne pas choisir la catégorie « Enfants ».
7. Compilation et envoi : `npx eas-cli@latest build --platform ios --profile production` puis
   `npx eas-cli@latest submit --platform ios`. Tester d'abord via **TestFlight**.
8. Revue : coller les [notes de revue](notes-de-revue.md) et le compte de démonstration.

### 3. Google Play Console

1. Créer l'app (gratuite, avec achats intégrés), langue par défaut français (Belgique).
2. Abonnements : les quatre produits, mêmes identifiants, reliés à RevenueCat. Créer un compte de service Google
   Cloud pour RevenueCat et pour `eas submit` (fichier JSON à ne jamais committer).
3. Contenu de l'application :
   - Sécurité des données : [declarations-stores.md](../rgpd/declarations-stores.md) ;
   - Public cible : **18 ans et plus** (l'application s'adresse aux parents ; l'enfant utilise une console limitée
     sur l'appareil du parent, sans compte, sans publicité ni achat) ;
   - Classification IARC : questionnaire « Éducation », aucune violence ni contenu sensible → Tout public ;
   - Publicités : non. Accès à l'application : fournir le compte de démonstration ;
   - Applications de santé : l'application n'est pas une application de santé (les besoins particuliers ne
     servent qu'à adapter des exercices scolaires) ; répondre en ce sens si la déclaration est demandée.
4. Fiche : textes de [fiche-stores.md](fiche-stores.md), captures `captures/android`, image de présentation
   1024 × 500 (à créer avec l'identité visuelle).
5. Compilation et envoi : `npx eas-cli@latest build --platform android --profile production` puis
   `npx eas-cli@latest submit --platform android` (piste de test interne, en brouillon), puis test fermé, puis
   production.

### 4. Avant d'ouvrir au public

- Faire tourner la bêta (TestFlight et test fermé) avec quelques familles : appareil photo, masquage des noms,
  notifications, achats en bac à sable, mode hors connexion sur de vrais appareils.
- Programmer les purges quotidiennes (README principal, points 7 et 8).
- Vérifier que `EXPO_PUBLIC_PAYMENTS_SIMULATION` vaut `false` en production et que la fonction
  `simulate-purchase` n'est **pas** déployée (ou que `ALLOW_SIMULATED_PURCHASES` n'est pas défini).
