# Accessibilité — vérifications sur téléphone

Ce qui est vérifié automatiquement : contrastes de la palette (test unitaire) et règles WCAG 2.2 A/AA sur les
écrans de la version web (axe-core, 18 écrans, thèmes clair et sombre). Le reste se vérifie à la main, sur un
iPhone (VoiceOver) et un Android (TalkBack), avant chaque version publique.

## Lecteur d'écran (VoiceOver, TalkBack)

- [ ] Chaque écran commence par un titre annoncé « en-tête » ; on peut naviguer de titre en titre.
- [ ] Les boutons annoncent leur action (« C'est fait ! », « Écouter », « Espace parent, code demandé »).
- [ ] Les choix (année, matière, besoins, jours) annoncent « bouton radio » ou « case à cocher » et leur état.
- [ ] Code parent : chaque chiffre est annoncé, l'avancement (« 2 chiffres sur 4 ») aussi, jamais le code saisi.
- [ ] Quiz : après une réponse, « bonne réponse » ou « ta réponse » est lu avec le choix ; l'explication est annoncée.
- [ ] Cartes de révision : la question puis la réponse sont lues ; les boutons de note sont atteignables.
- [ ] Minuteur Pomodoro : la phase (travail, pause) est annoncée quand elle change ; l'avancement est lu.
- [ ] Bandeau « Pas de connexion » annoncé quand le réseau tombe.
- [ ] Photo du journal : les zones masquées sont annoncées (« Photo avec 2 zones masquées »).

## Texte agrandi et affichage

- [ ] Taille de texte au maximum (Réglages > Accessibilité) : aucun texte coupé, aucun bouton qui déborde ;
      on peut faire défiler chaque écran.
- [ ] Mode sombre : tout reste lisible.
- [ ] Inversion des couleurs et « Réduire la transparence » : l'application reste utilisable.
- [ ] Rotation en paysage sur tablette : rien n'est masqué.

## Contrôle sans écran tactile

- [ ] Clavier externe (iPad) ou contrôle de sélection : tous les éléments sont atteignables, dans un ordre logique.

## Profils d'apprentissage (F12)

- [ ] Dyslexie : police Lexend, espacements larges, lecture vocale disponible partout où il y a une consigne.
- [ ] TDAH : une consigne visible à la fois, sessions courtes, pauses proposées.
- [ ] Dyscalculie : étapes décomposées, pas de minuteur imposé.
