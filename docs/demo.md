# Essayer Côte à Côte sur son Mac

L'application tourne dans le navigateur (Safari, Chrome…), avec un serveur complet installé sur le Mac. L'IA et
les paiements sont **simulés** : rien n'est envoyé sur Internet et rien n'est payant.

Comptez 20 à 30 minutes la première fois (installations et téléchargements), puis 1 minute les fois suivantes.

## 1. Installer les outils (une seule fois)

**Le plus simple : trois commandes dans le Terminal** (Applications > Utilitaires > Terminal), à coller une par
une. Le mot de passe de session du Mac est demandé (rien ne s'affiche pendant la frappe, c'est normal).

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

```bash
eval "$([ -x /opt/homebrew/bin/brew ] && /opt/homebrew/bin/brew shellenv || /usr/local/bin/brew shellenv)" && grep -q "brew shellenv" ~/.zprofile 2>/dev/null || echo 'eval "$([ -x /opt/homebrew/bin/brew ] && /opt/homebrew/bin/brew shellenv || /usr/local/bin/brew shellenv)"' >> ~/.zprofile
```

```bash
brew install --cask docker && brew install node pnpm && open -a Docker
```

La première installe Homebrew (le gestionnaire d'applications du Mac, quelques minutes), la deuxième le rend
disponible dans le Terminal, la troisième installe Docker Desktop, Node.js et pnpm, puis ouvre Docker (accepter
ses autorisations, « Skip » pour le compte). Passer ensuite directement à l'étape 2.

**Ou à la main**, sans Homebrew :

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

Le compte de démonstration contient « Léo » (5e primaire, dyslexie, fan de foot et d'espace) avec cinq
devoirs et deux semaines de suivi, et « Emma » (2e maternelle).

**Le parcours de base**

- **Premiers pas** : la liste en haut du cockpit guide les 4 étapes ; « Voir le planning » pour la suivante.
- **Photo du journal de classe** : « Photographier le journal de classe » > « Choisir dans la galerie », choisir
  une image. Masquez un nom en glissant la souris (rectangle noir), puis « Envoyer pour analyse ». *L'IA est
  simulée : elle propose toujours les deux mêmes tâches.*
- **Planning** : « Planning de la semaine » > « Calculer le planning » > « Publier sur la console de l'enfant ».
  Les fiches et quiz se préparent (contenu d'exemple sur les fleuves de Belgique). Dans le même écran :
  **Congés et absences** (ajoutez un congé : le planning l'évite, puis « Idées pour les vacances »).
- **Console enfant** : « Lancer la mission du jour ». Choisissez un code parent de 4 chiffres (évitez 1234).

**Dans la console de Léo**

- Un **petit mot** du parent l'attend (« Écouter le mot », « Merci ! »).
- **Comment tu te sens ?** : essayez « Un peu fatigué » : la mission se réduit à l'essentiel, avec une **pause
  respiration** guidée.
- **Révision express** : l'interro de demain propose de revoir ses cartes (après avoir publié le planning).
- **S'entraîner** sur une leçon : « Écouter la fiche » (lecture surlignée), quiz, exercices, **Écoute et
  écris** (mini-dictée des mots clés).
- **Minuteur** : « Commencer » affiche un disque qui fond avec le temps.
- Sur une fiche : **Explique-moi autrement** (autre explication, exemple selon ses centres d'intérêt) et
  **Je récite** (s'enregistrer puis se réécouter, autoriser le micro du navigateur).
- **Défi de la semaine** (sous la mission) : 2, 3 ou 4 jours, étoiles au fil de la semaine.
- **Récompenses** : Suivi > « Récompense en famille » (à gagner en X missions, suivie sur la console) ;
  en fin de mission, fête, **coffre-surprise** (un jour sur trois environ) et **défi bonus** ; série avec
  **2 jokers** par semaine ; dans « Mes badges » : **Ce que je sais**, **album des animaux de Belgique**,
  **trésors** trouvés.
- **Avatar** (touchez la graine) : badges, **accessoires** débloqués par l'effort, **couleur préférée**,
  **fond d'écran** (scènes illustrées selon l'âge et les centres d'intérêt, aperçu de chaque scène, « Arc-en-ciel »
  et « Aurore boréale » à débloquer ; plus discret pour un profil TDAH ; sur tablette, le décor se voit
  de part et d'autre du contenu), **diplômes** à imprimer.
- **🎈 Coin détente** (mission faite, ou « Un petit jeu » pendant la pause du minuteur) : memory (avec
  ses centres d'intérêt), coloriage de mandalas, taquin, mots mêlés (avec ses mots de dictée), sudoku
  (formes pour les petits), bulles à éclater. Sans chrono ni score ; un trésor par jour ; 10 min par jour
  par défaut (réglable ou fermé dans « Modifier le profil »), puis « Ta pause est finie, à demain ! ».
  Le temps de jeu apparaît dans le Suivi, à part du travail ; il ne rapporte aucun point d'effort.

- **🎒 Cartable** : la liste à cocher « Mon cartable pour demain » (le matin même avant 10 h).
- **🗣️ Je lis à voix haute** (primaire) : texte de son niveau, chronométré, le parent touche les mots
  difficiles ; **🎧 Écoute et choisis** et **🔊 Écouter** sur les cartes de langue (néerlandais, anglais…).
- **🌟 Carnet de fierté** : après la mission (ou dans « Mes badges »), un moment dont il est fier.
- **🤝 Défi de la fratrie** : total commun des missions sur la console (avec au moins deux enfants).

**Côté parent**

- **🎒 Cartable** (carte de l'enfant) : affaires et jours (gym, piscine…), idées toutes prêtes.
- **Suivi** : **📅 Plan de blocus** (secondaire et 6e primaire : horaire des examens, révisions aussi le
  week-end, examen blanc la veille, aperçu jour par jour, avancement des révisions), **📄 Bilan pour un professionnel** (période et parties au choix, besoins
  jamais d'office, impression ou PDF), courbe de **lecture à voix haute**, **carnet de fierté** à imprimer.
- **🤝 Défi des frères et sœurs** (cockpit, dès deux enfants) : objectif commun, « Récompense donnée ».

- **Ce soir à table** apparaît dans le cockpit quand l'enfant a étudié aujourd'hui : questions pour en parler.
- **Écrire un petit mot**, **Suivi** (bilan positif de la semaine à lire ou partager), **Modifier le profil**
  (centres d'intérêt, jours, durée, papier) > **Tablette de l'enfant**.
- **Planning** : **Remarque de l'enseignant** (devient une leçon à retravailler), **Semaine chargée**
  (l'essentiel seulement) dans la proposition, **congés scolaires 2026-2027** à ajouter en un geste.
- **Mon abonnement** : **parrainage** (code à partager, un mois offert) ; **Mon compte** : bilan de la semaine
  par e-mail (non envoyé dans la démonstration).
- **Emma** : « Activités de la semaine » (jeux à faire ensemble, thème de la classe).
- **Mon compte** : inviter un **autre parent** (code à partager), rappels, abonnement (achat simulé), export
  des données.
- **Tablette de l'enfant** : ouvrez une **fenêtre de navigation privée**, « Relier la tablette de mon enfant »,
  recopiez le code affiché par le parent : elle n'affiche que la console de l'enfant.
- **Format téléphone** : dans Safari, menu Développement > Mode de conception adaptatif (à activer dans
  Réglages > Avancées) ; dans Chrome, clic droit > Inspecter, puis l'icône téléphone.

## 5. Essayer sur l'iPhone

L'iPhone ouvre la démonstration qui tourne sur le Mac, par le Wi-Fi (l'iPhone et le Mac doivent être sur le
**même réseau**).

1. Arrêter la démonstration si elle tourne (`Ctrl + C`), puis lancer :

   ```bash
   pnpm demo:iphone
   ```

   (équivalent : `pnpm demo --iphone`). Le même mode sert pour l'**iPad**.

   La première fois, la version pour l'iPhone est préparée (2 à 3 minutes). Si le Mac demande d'autoriser les
   connexions entrantes pour « node », cliquer sur **Autoriser**.

2. Un **code QR** s'affiche dans le Terminal : le scanner avec l'appareil photo de l'iPhone (ou taper dans
   Safari l'adresse affichée, du type `http://192.168.1.23:8765`).
3. Se connecter avec le compte de démonstration. Sur l'iPhone, « Prendre une photo » ouvre **le vrai appareil
   photo** : photographiez une page du journal de classe (l'analyse reste simulée).
4. Pour l'avoir comme une application : dans Safari, bouton Partager > **Sur l'écran d'accueil**.

Si le Mac change de réseau Wi-Fi, relancer simplement `pnpm demo --iphone` : la version iPhone est refaite
automatiquement avec la nouvelle adresse.

## Essayer une nouvelle version

1. Arrêter la démonstration si elle tourne (`Ctrl + C` dans son Terminal).
2. Télécharger à nouveau le ZIP de la branche (étape 2), le décompresser et remplacer l'ancien dossier
   `cote-a-cote` (le supprimer d'abord, puis renommer le nouveau).
3. Dans le Terminal :

   ```bash
   cd ~/Downloads/cote-a-cote
   pnpm install
   pnpm demo:iphone
   ```

La base de données est mise à jour (vos essais sont gardés) et l'application est préparée de nouveau, avec
les nouveautés, automatiquement.

## Ce qui ne peut pas être essayé sur Mac ni dans Safari

Le masquage **automatique** des noms (reconnaissance de texte du téléphone), les notifications de rappel, le
fonctionnement sans réseau en conditions réelles et les vrais achats (RevenueCat, en bac à sable) ne fonctionnent
que dans l'application installée sur un téléphone : bêta TestFlight (iPhone) ou test interne Google Play.

## En cas de problème

| Message | Que faire |
|---|---|
| « Docker ne répond pas » | Ouvrir Docker Desktop, attendre « Engine running », relancer `pnpm demo` |
| « command not found: pnpm » | Refaire l'étape 1.3, puis fermer et rouvrir le Terminal |
| « Supabase n'a pas pu démarrer » | Quitter puis rouvrir Docker Desktop, relancer `pnpm demo` |
| La page ne s'affiche plus ou montre l'ancienne version | `pnpm demo --rebuild` (ou `pnpm demo:iphone --rebuild`) |
| L'iPhone n'arrive pas à ouvrir la page | Vérifier le même Wi-Fi ; Réglages Système > Réseau > Coupe-feu : autoriser « node » ; certains Wi-Fi publics ou d'entreprise isolent les appareils |
| « Une démonstration est déjà lancée sans le mode iPhone » | `Ctrl + C` dans le Terminal où elle tourne, puis `pnpm demo --iphone` |
| Repartir de zéro (effacer tous les essais) | `pnpm exec supabase db reset` puis `pnpm demo` |
