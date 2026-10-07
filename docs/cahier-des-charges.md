# Côte à Côte — Cahier des charges

> Plateforme de suivi et d'accompagnement scolaire inclusif
> Version 0.1 — octobre 2026 — document de travail

---

## 1. Vision

Accompagner un enfant dans sa scolarité représente une charge mentale importante pour les parents : savoir ce qu'il faut étudier, pour quand, comment s'organiser, comment adapter le travail à un enfant qui a un TDAH ou un trouble « dys ».

**Côte à Côte** est un assistant pédagogique pour les familles. Le parent photographie le journal de classe et les cours ; l'application en extrait les devoirs et les échéances, les relie au programme officiel, puis propose un planning de travail et des exercices adaptés au profil de l'enfant.

Trois principes guident le produit :

1. **Aligné sur le programme officiel** de la Fédération Wallonie-Bruxelles (FWB).
2. **Inclusif** : les besoins éducatifs particuliers sont au cœur de la conception, pas une option.
3. **Le parent garde la main** : tout ce que l'IA produit est validable et modifiable par le parent.

## 2. Public cible

| Persona | Description | Attentes principales |
|---|---|---|
| **Le parent** (acheteur et utilisateur principal) | Parent d'un ou plusieurs enfants scolarisés en FWB, souvent débordé | Gagner du temps, savoir quoi faire chaque jour, être alerté à temps |
| **L'enfant** (utilisateur secondaire) | De la maternelle à la fin du secondaire | Une consigne claire et courte, un travail motivant, pas de distraction |
| **Le parent d'un enfant à besoins particuliers** | Enfant avec TDAH, dyslexie, dyscalculie | Supports adaptés, rythme adapté, méthodes de concentration |

## 3. Périmètre

### 3.1 Géographie et programmes

- **Fédération Wallonie-Bruxelles** uniquement au lancement.
- Niveaux couverts : **maternelle, primaire, secondaire**.
- Types d'enseignement : **général, technique, professionnel, spécialisé**.
- Épreuves externes : **CEB** (fin de primaire), **CE1D** (fin du 1er degré), **CESS** (fin du secondaire).
- Les référentiels du **tronc commun** et les programmes des réseaux (WBE, enseignement catholique, officiel subventionné, libre non confessionnel) seront intégrés progressivement. La réforme du tronc commun impose de pouvoir **mettre à jour** ces contenus.

### 3.2 Langue

- Interface et contenus en **français** uniquement au lancement.

### 3.3 Plateformes

- Application **iPhone, Android et tablettes** (une seule base de code).
- L'interface enfant est conçue **d'abord pour la tablette**, utilisable sur téléphone.
- Une version web du cockpit parent est envisagée plus tard.

### 3.4 Hors périmètre au lancement

- Communication avec l'école ou les enseignants.
- Autres communautés (Flandre, Communauté germanophone) et autres pays.
- Validation du contenu par des professionnels (prévue plus tard si le produit est rentable).

## 4. Comptes, profils et rôles

- **Compte parent** : créé avec une adresse e-mail. Il porte l'abonnement et donne accès au cockpit parent.
- **Profils enfants** : un ou plusieurs par compte (selon la formule). Chaque profil est identifié par le **prénom** de l'enfant (ex. « Léa »), jamais par son nom de famille.
- **Informations d'un profil enfant** :
  - alias et avatar ;
  - année scolaire (ex. P4, S2) et type d'enseignement ;
  - réseau et options (secondaire) ;
  - besoins éducatifs particuliers : TDAH, dyslexie, dyscalculie (cumulables) ;
  - préférences : durée des sessions, jours disponibles, préférence papier ou écran.
- **Changement de vue** : sur un même appareil, l'enfant accède à sa console ; le retour au cockpit parent est protégé par un **code parent**.
- **Appareil de l'enfant** (tablette séparée) : le parent peut le relier à un profil enfant par un code ou un QR code ; cet appareil n'affiche que la console enfant.

## 5. Fonctionnalités

Chaque fonctionnalité porte un identifiant et une **étape de livraison** (voir section 8).

### F1 — Profil enfant inclusif *(étape 1)*

- Création et modification des profils décrits en section 4.
- Les besoins particuliers ajustent automatiquement : la durée des sessions, la mise en forme (police, espacements), le type d'exercices et le volume de travail.
- **Critères d'acceptation** : un parent crée un profil en moins de 2 minutes ; aucun nom de famille n'est demandé.

### F2 — Synchronisation avec le programme officiel *(étape 1 pour le socle, enrichi ensuite)*

- Le profil est relié aux attendus du référentiel correspondant à son année et à ses options.
- Vue « Programme de l'année » : matières, chapitres, compétences.
- Les leçons scannées sont rattachées automatiquement à un point du programme ; le parent peut corriger ce rattachement.

### F3 — Numérisation intelligente *(étape 1)*

- Prise de photo dans l'application (ou import depuis la galerie) : journal de classe, notes de cours, interrogations corrigées.
- **Protection de la vie privée** : avant l'envoi, les noms détectés (enfant, enseignants, école) sont floutés automatiquement ; le parent peut ajouter des zones de flou à la main.
- L'IA extrait : matière, type (devoir, leçon, interrogation, examen), description, date d'échéance, pages ou exercices concernés.
- **Écran de validation** : le parent voit la liste extraite, corrige, supprime ou ajoute avant que rien ne soit planifié.
- Les photos sont **supprimées** après traitement ; seul le contenu validé est conservé.
- **Critères d'acceptation** : une page de journal de classe lisible est traitée en moins de 20 secondes ; le parent peut tout modifier.

### F4 — Parcours hebdomadaire *(étape 1 : planning ; étape 2 : contenus générés)*

- Génération d'un planning de la semaine à partir des échéances validées, des disponibilités de l'enfant et de son profil.
- Chaque session contient : l'objectif, la durée, les activités (relire, s'exercer, se tester).
- Étape 2 : exercices, fiches de lecture et quiz **générés sur mesure** à partir du contenu scanné et du programme.
- Le parent valide ou ajuste le planning avant publication sur la console enfant.

### F5 — Préparation aux évaluations *(étape 3)*

- Dossier de révision pour une interrogation ou un examen : synthèse, fiches, exercices progressifs, examen blanc.
- Parcours spécifiques **CEB, CE1D, CESS**, s'appuyant sur les épreuves des années précédentes publiées par la FWB.
- Supports calibrés selon le profil cognitif (voir F12).

### F6 — Enrichissement culturel *(étape 3)*

- Suggestions liées à la matière du moment : documentaires, musées et lieux en Belgique, jeux éducatifs, livres.
- Les suggestions proviennent d'une **base de contenus vérifiés** (pas d'invention de lien par l'IA).

### F7 — Double vue : cockpit parent et console enfant *(étape 1 : version simple ; étape 3 : cockpit avancé)*

- **Cockpit parent** : planning de la semaine, échéances, alertes de charge, progression, validation des contenus.
- **Console enfant** : uniquement la **mission du jour**, en grands boutons, sans menus ni distractions. L'interface s'adapte à l'âge (pictogrammes et lecture vocale pour les plus jeunes).
- Étape 3 : statistiques de progression, historique, comparaison semaine par semaine.

### F8 — Régulation de la charge de travail *(étape 2)*

- Détection des semaines ou des jours surchargés (ex. trois interrogations le même jour).
- Proposition proactive au parent : étaler les révisions sur les jours précédents ou le week-end.
- Le parent accepte, modifie ou refuse la proposition.

### F9 — Concentration et mémorisation *(étape 1 : Pomodoro ; étape 2 : répétition espacée)*

- **Minuteur Pomodoro** intégré aux sessions : durée de travail et de pause adaptées au profil (ex. 10 min / 3 min pour un jeune enfant TDAH).
- **Flashcards à répétition espacée** générées automatiquement (vocabulaire, définitions, dates, formules).

### F10 — Export « Print & Go » *(étape 2)*

- Génération en un clic de fiches de travail et de synthèse en PDF.
- Règles d'accessibilité appliquées selon le profil : police adaptée à la dyslexie, grande taille, interlignage et espacements larges, une consigne par ligne, peu d'éléments par page.
- Impression directe (AirPrint, Android) ou partage du PDF.

### F11 — Gamification éthique *(étape 3)*

- Valorise **l'effort, la régularité et la persévérance**, pas les résultats bruts.
- Récompenses visuelles : badges, évolution d'un avatar, série de jours.
- Aucun classement entre enfants, aucune perte de récompense punitive, aucun mécanisme addictif.

### F12 — Adaptations par besoin particulier *(transversal, toutes étapes)*

| Besoin | Adaptations |
|---|---|
| **TDAH** | Sessions courtes, pauses fréquentes, une seule consigne visible à la fois, minuteur visuel, récompenses fréquentes |
| **Dyslexie** | Police adaptée, espacements larges, lecture vocale des consignes, moins de texte, consignes en couleur ou pictogrammes |
| **Dyscalculie** | Supports visuels (manipulation, schémas), calculatrice autorisée selon le contexte, étapes décomposées, pas de contrainte de temps |

### F13 — Abonnement *(étape 1)*

- Essai gratuit de 14 jours.
- Formules Solo et Famille, au mois ou à l'année, renouvelées automatiquement (voir section 7).
- Paiement via l'App Store et Google Play.
- Limites d'usage raisonnables pour maîtriser les coûts de l'IA.

## 6. Exigences non fonctionnelles

### 6.1 Vie privée et RGPD

- Les enfants sont identifiés par leur **prénom**, jamais leur nom de famille ; le prénom n'est jamais envoyé à l'IA et il est masqué sur les photos.
- Les besoins particuliers sont des **données de santé** : consentement explicite du parent, chiffrement, accès strictement limité.
- Hébergement des données **dans l'Union européenne**.
- Floutage des noms sur les photos avant tout envoi à l'IA ; photos supprimées après traitement.
- Le parent peut **exporter** et **supprimer** toutes ses données à tout moment.
- Une analyse d'impact (AIPD) et une politique de confidentialité relue par un juriste sont nécessaires **avant le lancement public**.

### 6.2 Accessibilité

- Respect des recommandations WCAG 2.2 niveau AA pour les interfaces.
- Compatibilité avec VoiceOver et TalkBack.
- Mode de lecture vocale des consignes dans la console enfant.

### 6.3 Performance et disponibilité

- Démarrage de l'application en moins de 3 secondes.
- La mission du jour reste **consultable hors connexion** ; les actions sont synchronisées au retour du réseau.
- Les traitements IA longs affichent une progression et ne bloquent pas l'application.

### 6.4 Qualité du contenu généré

- Tout contenu généré peut être **signalé** par le parent (« erreur dans cet exercice »).
- Les contenus sont générés à partir du programme officiel et du contenu scanné, pas « de mémoire ».

## 7. Modèle économique

| Formule | Prix TTC |
|---|---|
| Essai gratuit | 14 jours |
| Solo (1 enfant) | 9,99 € / mois |
| Famille (jusqu'à 4 enfants) | 14,99 € / mois |
| Annuel (renouvelé automatiquement) | 79 € Solo — 119 € Famille par an |

- Coût IA estimé : 2 à 3 € par enfant actif et par mois (à mesurer sur prototype).
- Marge estimée : 4 à 5 € par abonné Solo après TVA (21 %), commission des stores (15 %) et IA.
- Seuil de rentabilité estimé : environ 25 abonnés pour couvrir l'infrastructure fixe.

## 8. Livraison par étapes

### Étape 1 — Le cœur (« je photographie, l'appli organise »)

- F1 Profils enfants avec alias et besoins particuliers
- F2 Socle du programme (au minimum : primaire FWB)
- F3 Numérisation, floutage, extraction par IA, validation par le parent
- F4 Planning hebdomadaire (sans contenus générés)
- F7 Cockpit parent simple et console enfant « mission du jour »
- F9 Minuteur Pomodoro
- F13 Abonnement et essai gratuit

**Objectif** : tester avec 10 à 20 familles (bêta privée via TestFlight et test interne Google Play).

### Étape 2 — L'apprentissage

- F4 Exercices, fiches et quiz générés
- F8 Régulation de la charge de travail
- F9 Flashcards à répétition espacée
- F10 Export PDF accessible
- F2 Programme étendu au secondaire et à la maternelle

**Objectif** : lancement public sur les stores.

### Étape 3 — L'excellence

- F5 Dossiers de révision et parcours CEB, CE1D, CESS
- F6 Enrichissement culturel
- F7 Cockpit parent avancé
- F11 Gamification éthique

## 9. Risques et hypothèses

| Risque | Impact | Mesure |
|---|---|---|
| L'IA lit mal certaines écritures manuscrites | Mauvaises échéances | Validation systématique par le parent |
| Erreurs dans les exercices générés | Perte de confiance | Génération ancrée sur le programme, signalement, relecture humaine plus tard |
| Structuration des référentiels très longue | Retard | Commencer par le primaire, outillage d'import semi-automatique |
| Coût de l'IA plus élevé que prévu | Marge réduite | Limites d'usage, mise en cache, traitements groupés, mesure dès la bêta |
| Données de santé de mineurs | Risque juridique | Minimisation (prénom seulement, rien d'identifiant envoyé à l'IA), hébergement UE, AIPD, juriste avant lancement |
| Un seul développeur | Délais, maintenance | Services gérés (Supabase, Expo, RevenueCat), périmètre par étapes |

## 10. Questions ouvertes

- Faut-il une option de paiement hors stores (site web) pour éviter la commission ?
- Quelle police adaptée à la dyslexie retenir (OpenDyslexic, Lexend, autre) ? À tester avec des familles.
- Mode maternelle : quelles activités concrètes proposer au parent ?
- Logo, couleurs et identité visuelle à définir.
