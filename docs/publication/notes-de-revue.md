# Notes pour les équipes de revue

À coller dans App Store Connect (« Informations pour la revue de l'app ») et dans Google Play Console
(« Accès à l'application »). Les équipes de revue lisent l'anglais : la version anglaise est à coller, la version
française sert de référence.

## Compte de démonstration

Créer, sur le projet Supabase de **production**, un compte réservé à la revue, sans données réelles :

```
pnpm beta compte-revue revue@<votre-domaine> <mot de passe>
```

Le compte est confirmé, contient « Léo » (5e primaire) et trois devoirs validés, avec un an d'accès. Le code
parent n'est pas lié au compte : l'équipe de revue choisit le sien (4 chiffres) au premier lancement de la
mission.

- Adresse : [À COMPLÉTER]
- Mot de passe : [À COMPLÉTER]

## Version anglaise

```
Côte à Côte helps parents in the French-speaking part of Belgium organise their children's homework.

Demo account: [email] / [password]. The account already contains a child profile ("Léo") with three
homework tasks. During the beta, creating a new account requires an invitation code: please use the demo
account.

How to test:
1. Parent dashboard: tap "Planning de la semaine", then "Calculer le planning" and
   "Publier sur la console de l'enfant", then a task to see the AI-generated study sheet and quiz.
2. "Photographier le journal de classe": take a photo of any school diary page (a page of handwritten homework
   works). The photo is read by our AI service, which does not copy any names, and is deleted from our servers
   after analysis.
3. "Lancer la mission du jour": you are asked to choose a 4-digit parent code, then the child console opens.
   The child console only shows the day's tasks; leaving it ("Espace parent") requires the parent code.

Children do not have accounts: the app is used by parents, who may hand their own device to their child for the
daily tasks. There are no ads, no external links in the child console and no purchases accessible from it.

Subscriptions (auto-renewable, 14-day free trial managed in the app): Solo and Famille, monthly or yearly.
Terms of use and privacy policy are linked on the subscription screen. Account deletion: "Mon compte et réglages"
> "Supprimer mon compte".

Optional health-related information (ADHD, dyslexia, dyscalculia) is only stored with explicit parental consent
and is used solely to adapt the exercises; it is never sent to third parties as such.
```
