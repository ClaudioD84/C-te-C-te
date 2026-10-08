# TestFlight : la vraie application sur iPhone et iPad

Les familles installent l'app **TestFlight** (gratuite, d'Apple), touchent votre lien et installent Côte à Côte
comme n'importe quelle application. Les mises à jour arrivent toutes seules.

## Déjà prêt dans le dépôt

- Icône et écran de démarrage **provisoires** aux couleurs de l'app (en attendant l'identité visuelle), clair et
  sombre ; textes d'autorisation (appareil photo, photos, micro) en français.
- **Mises à jour à distance** (`expo-updates`) : la plupart des corrections arrivent chez les testeurs sans
  nouvelle build ni revue d'Apple.
- Profils EAS (`apps/mobile/eas.json`) avec leurs canaux de mise à jour ; numéros de build automatiques.
- Compte de démonstration pour la revue d'Apple : `pnpm beta compte-revue`.
- Bouton GitHub **Actions > TestFlight** : nouvelle build ou mise à jour, sans passer par le Mac.
- Page « Adresse confirmée » pour le lien de l'e-mail de confirmation (`/confirmation.html` de la version web).

## Ce qu'il vous faut

| Quoi | Où | Délai, coût |
|---|---|---|
| Apple Developer Program | developer.apple.com/programs/enroll | 99 $ par an. **Individuel** : 1 à 2 jours, votre nom apparaît comme éditeur. **Organisation** : numéro D-U-N-S, 1 à 2 semaines, nom de la société |
| Compte Expo (gratuit) | expo.dev | Builds dans le cloud, pas besoin de Xcode |
| Serveur de production | [README de la bêta](README.md), étape 1 | Supabase (UE), clé Anthropic, Brevo |
| Votre Mac | — | Pour la toute première build (connexion à Apple) |

## 1. Relier le projet à Expo (une fois)

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init              # ajoute l'identifiant du projet EAS à app.json
npx eas-cli@latest update:configure  # ajoute l'adresse des mises à jour à distance à app.json
```

Commitez les changements d'`app.json` (identifiant du projet et adresse des mises à jour).

Sur expo.dev > projet > **Environment variables**, environnement `production` :

| Variable | Valeur |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<projet>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publique Supabase |
| `EXPO_PUBLIC_PAYMENTS_SIMULATION` | `false` |
| `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` | liens publics (provisoires acceptés pour la bêta) |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | facultatif pendant la bêta |

Sans RevenueCat, l'écran Abonnement indique que l'abonnement n'est pas encore disponible : les testeurs utilisent
l'essai offert par leur code d'invitation (90 jours par défaut).

## 2. Première build (depuis le Mac, une fois)

```bash
cd apps/mobile
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

EAS demande votre identifiant Apple, crée les certificats, crée l'app dans App Store Connect si elle n'existe pas,
compile dans le cloud (20 à 30 minutes) puis l'envoie sur TestFlight. Apple la traite ensuite (10 à 30 minutes).
Le nom « Côte à Côte » doit être libre sur l'App Store ; sinon, choisissez par exemple « Côte à Côte – Devoirs ».

Quand EAS le propose, acceptez d'enregistrer une **clé API App Store Connect** : c'est elle qui permet ensuite
d'envoyer les builds depuis GitHub sans vous reconnecter.

## 3. Ouvrir le test (App Store Connect > Apps > Côte à Côte > TestFlight)

**Vous-même d'abord (testeurs internes, sans revue)** : créez un groupe interne, ajoutez-vous, installez
TestFlight sur votre iPhone ou iPad et acceptez l'invitation. Disponible dès que la build est traitée.

**Les familles (testeurs externes, jusqu'à 10 000)** :

1. Créez un compte de démonstration sur le serveur de production :
   `pnpm beta compte-revue revue@<votre-domaine> <mot de passe>` (voir le [README](README.md) pour les clés).
2. **Informations de test** : description de la bêta, e-mail de contact, compte de démonstration et notes en
   anglais de [notes-de-revue.md](../publication/notes-de-revue.md).
3. Créez un groupe externe « Familles bêta », ajoutez la build et soumettez-la à la **revue bêta d'Apple**
   (souvent moins de 48 heures ; seule la première build de chaque version est revue).
4. Activez le **lien public** du groupe : c'est lui que vous envoyez aux familles, avec leur code d'invitation
   (`pnpm beta code …`) et le [guide du testeur](guide-testeur.md).

Côté famille : installer **TestFlight** depuis l'App Store, ouvrir le lien, toucher **Installer**. Chaque build
reste installable 90 jours.

## 4. Pendant la bêta

| Changement | Comment | Délai pour les testeurs |
|---|---|---|
| Écrans, textes, corrections (JavaScript) | GitHub > **Actions > TestFlight > Run workflow > mise-a-jour** | Téléchargée au lancement, appliquée au suivant |
| Bibliothèque native, autorisation, icône, version | GitHub > Actions > TestFlight > **build** | Nouvelle build TestFlight (environ 1 heure) |

Le bouton GitHub demande le secret **`EXPO_TOKEN`** (expo.dev > Account settings > Access tokens, puis GitHub >
Settings > Secrets and variables > Actions). Depuis le Mac, les mêmes actions :
`npx eas-cli@latest update --channel production --environment production -m "…"` ou la commande de build
ci-dessus.

## 5. E-mail de confirmation du compte

Sur iPhone, le lien de l'e-mail de confirmation s'ouvre dans le navigateur. Mettez la version web en ligne
(`pnpm deploy:web`, voir le [README](README.md)) puis, dans Supabase > Authentication > URL Configuration :
**Site URL** = `https://<site>.expo.app/confirmation.html`. La page dit au parent de revenir dans l'application
pour se connecter.

## Limites connues

- Pas encore de « Mot de passe oublié » dans l'application : en cas d'oubli, réinitialisez le compte depuis
  Supabase (Authentication > Users) ou ajoutez cette fonction avant d'élargir la bêta.
- Icône provisoire : à remplacer par l'identité visuelle définitive avant la publication sur l'App Store.
- Android : même principe avec le test interne de Google Play (voir [publication](../publication/README.md)).
