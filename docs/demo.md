# Essayer Côte à Côte sur son Mac

L'application tourne dans le navigateur (Safari, Chrome…), avec un serveur complet installé sur le Mac. L'IA et
les paiements sont **simulés** : rien n'est envoyé sur Internet et rien n'est payant.

Comptez 20 à 30 minutes la première fois (installations et téléchargements), puis 1 minute les fois suivantes.

## 1. Installer les outils (une seule fois)

1. **Docker Desktop** : sur [docker.com](https://www.docker.com/products/docker-desktop/), télécharger la version
   pour Mac (puce « Apple » ou « Intel » : menu  > À propos de ce Mac). Ouvrir le fichier, glisser Docker dans
   Applications, puis lancer Docker et accepter les autorisations. Inutile de créer un compte Docker
   (« Skip »).
2. **Node.js** : sur [nodejs.org](https://nodejs.org/fr), télécharger la version **LTS** (22 ou plus), puis
   installer le fichier `.pkg` comme n'importe quelle application.
3. **pnpm** : ouvrir l'app **Terminal** (Applications > Utilitaires), coller cette ligne puis Entrée :

   ```bash
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

   Puis **fermer et rouvrir** le Terminal.

## 2. Récupérer l'application (une seule fois)

1. Sur GitHub, ouvrir le dépôt `ClaudioD84/C-te-C-te`, choisir la branche **`claude/nifty-sagan-pqfqdl`** (ou
   `main` une fois la pull request fusionnée), puis **Code > Download ZIP**.
2. Double-cliquer sur le ZIP téléchargé : un dossier apparaît dans Téléchargements. Le renommer
   **`cote-a-cote`** pour simplifier.
3. Dans le Terminal :

   ```bash
   cd ~/Downloads/cote-a-cote
   pnpm install
   ```

   L'installation prend quelques minutes. Des messages « WARN » sont normaux.

## 3. Lancer la démonstration

1. Vérifier que **Docker Desktop est ouvert** (icône de baleine dans la barre de menus ; dans la fenêtre de
   Docker, « Engine running » en bas à gauche).
2. Dans le Terminal :

   ```bash
   cd ~/Downloads/cote-a-cote
   pnpm demo
   ```

   La première fois, Docker télécharge le serveur (5 à 10 minutes) puis l'application est préparée (2 à 3
   minutes). Le navigateur s'ouvre tout seul sur **http://127.0.0.1:8765** quand tout est prêt ; l'adresse et
   les identifiants s'affichent aussi dans le Terminal.

3. Se connecter avec le compte de démonstration :
   - adresse e-mail : `demo@coteacote.be`
   - mot de passe : `demo-cote-a-cote`

   Ou créer un nouveau compte (aucun e-mail n'est envoyé : il est actif tout de suite).

**Pour arrêter** : dans le Terminal, `Ctrl + C`. La ligne « ELIFECYCLE Command failed » qui s'affiche alors est
normale. Le serveur reste en veille dans Docker ; pour l'arrêter aussi : `pnpm exec supabase stop` (ou quitter
Docker Desktop).

## 4. Ce que vous pouvez essayer

Le compte de démonstration contient l'enfant « Petit Lion » (5e primaire, dyslexie), cinq devoirs et deux
semaines de suivi.

- **Photo du journal de classe** : « Photographier le journal de classe » > « Choisir dans la galerie »,
  choisir une image sur le Mac. Masquez un nom en glissant la souris sur la photo (rectangle noir), puis
  « Envoyer pour analyse ». *L'IA est simulée : elle propose toujours les deux mêmes tâches (fractions, fleuves
  de Belgique).*
- **Planning** : « Planning de la semaine » > « Calculer le planning » > « Publier sur la console de l'enfant ».
  Les fiches et quiz apparaissent dans la liste (contenu d'exemple sur les fleuves de Belgique).
- **Console enfant** : « Lancer la mission du jour ». Choisissez un code parent de 4 chiffres (évitez 1234) ;
  il sera demandé pour revenir à l'espace parent.
- **Suivi, dossier de révision, abonnement** (achat simulé, aucun paiement), **rappels**, **modifier le
  profil**, **export de mes données**.
- **Format téléphone** : dans Safari, menu Développement > Mode de conception adaptatif (à activer dans
  Réglages > Avancées) ; dans Chrome, clic droit > Inspecter, puis l'icône téléphone.

## Ce qui ne peut pas être essayé sur Mac

L'appareil photo, le masquage **automatique** des noms (reconnaissance de texte du téléphone), les
notifications de rappel et les vrais achats ne fonctionnent que dans l'application installée sur un téléphone
(bêta TestFlight ou test interne Google Play).

## En cas de problème

| Message | Que faire |
|---|---|
| « Docker ne répond pas » | Ouvrir Docker Desktop, attendre « Engine running », relancer `pnpm demo` |
| « command not found: pnpm » | Refaire l'étape 1.3, puis fermer et rouvrir le Terminal |
| « Supabase n'a pas pu démarrer » | Quitter puis rouvrir Docker Desktop, relancer `pnpm demo` |
| La page ne s'affiche plus après une mise à jour du code | `pnpm demo --rebuild` |
| Repartir de zéro (effacer tous les essais) | `pnpm exec supabase db reset` puis `pnpm demo` |
