# Analyse d'impact relative à la protection des données (AIPD)

> Projet — version du 5 octobre 2026. Méthode inspirée de la CNIL (PIA) et des lignes directrices du CEPD.
> À relire et valider par un juriste ; à revoir à chaque changement important.

## 1. Pourquoi une AIPD est nécessaire

Le traitement réunit plusieurs critères qui rendent l'analyse obligatoire (art. 35, liste de l'APD) :

- **données de santé** (besoins particuliers : TDAH, dyslexie, dyscalculie) ;
- **personnes vulnérables** : des enfants, de la maternelle à la fin du secondaire ;
- **technologie innovante** : analyse de photos et production de contenus par une IA ;
- **transferts hors de l'Union européenne** vers les sous-traitants d'IA et d'abonnement.

## 2. Description du traitement

Côte à Côte aide les parents à organiser le travail scolaire de leurs enfants : le parent photographie le journal
de classe, l'IA en extrait les devoirs et évaluations, l'application propose un planning, des fiches, des quiz et
des cartes de révision adaptés à l'année et au profil de l'enfant. Le détail des données, finalités et durées
figure dans le [registre](registre-des-traitements.md).

Flux principaux :

1. **Photo** : prise sur l'appareil → noms masqués sur l'appareil (reconnaissance de texte locale et masques
   tracés par le parent) → envoi au stockage privé → lecture par l'IA → **suppression de la photo** → tâches
   proposées au parent, qui les valide.
2. **Contenus d'étude** : tâche validée + année + consignes d'adaptation + attendus du programme officiel → IA →
   fiche, quiz, exercices, cartes, enregistrés pour la famille.
3. **Console enfant** : l'enfant voit sa mission du jour, s'entraîne ; ses efforts sont enregistrés pour les
   récompenses et le suivi par le parent.

## 3. Nécessité et proportionnalité

| Principe | Mise en œuvre |
|---|---|
| Finalités déterminées | Organisation du travail scolaire et préparation de supports d'étude ; aucune publicité, aucune revente |
| Minimisation | Prénom seulement, jamais de nom de famille ; prénom jamais envoyé à l'IA et masqué automatiquement sur les photos ; aucune date de naissance, adresse ni école demandée ; besoins particuliers facultatifs ; trouble jamais transmis à l'IA ; photo masquée avant envoi |
| Exactitude | Le parent valide chaque tâche extraite et peut signaler une erreur dans un contenu généré |
| Limitation de la conservation | Photo supprimée dès l'analyse (24 h au plus) ; journal de l'effort effacé après 2 ans ; comptes inactifs depuis 24 mois supprimés après avertissement |
| Base légale | Contrat pour le service ; consentement explicite, horodaté et facultatif pour les besoins particuliers |
| Information | Politique de confidentialité en langage simple ; explications au moment du consentement |
| Droits des personnes | Export et suppression depuis l'application ; modification et suppression d'un profil, retrait du consentement ; contact vie privée |
| Sous-traitants | Liste dans le registre ; DPA et encadrement des transferts à finaliser |

## 4. Risques et mesures

Échelle : gravité et vraisemblance de 1 (négligeable) à 4 (maximale), **après** les mesures.

| Risque | Sources | Mesures | Gravité | Vraisemblance |
|---|---|---|---|---|
| Accès illégitime aux données d'une famille (piratage, erreur de cloisonnement) | Attaquant, défaut logiciel | RLS sur toutes les tables et tests de cloisonnement ; clés côté serveur ; HTTPS ; mots de passe hachés ; journalisation de l'hébergeur | 3 (données de santé d'enfants) | 1 |
| Divulgation de l'identité de l'enfant via les photos | Noms visibles sur le journal | Masquage sur l'appareil avant envoi ; liste des noms jamais envoyée ; photo supprimée après analyse | 3 | 2 (masquage automatique imparfait, contrôlé par le parent) |
| Réutilisation des données par le fournisseur d'IA | Sous-traitant | Requêtes sans identité ni trouble nommé ; DPA ; vérification de la non-utilisation pour l'entraînement et de la durée de conservation (plan d'action) | 2 | 1 |
| Accès par des autorités étrangères (transferts vers les États-Unis) | Législation étrangère | Données envoyées minimisées (ni prénom, ni nom, ni e-mail, ni trouble nommé) ; encadrement des transferts (DPF ou clauses types) ; hébergement principal dans l'UE | 2 | 1 |
| Accès de l'enfant à l'espace parent (et aux données de santé) | Usage partagé de l'appareil | Code parent pour quitter la console enfant ; la console n'affiche ni les besoins ni les réglages | 2 | 1 |
| Perte de l'appareil | Vol, oubli | Données sensibles en stockage chiffré ; cache limité (7 jours) ; déconnexion à distance possible en changeant le mot de passe [à vérifier] | 2 | 2 |
| Effet néfaste des contenus ou de la gamification (pression, comparaison) | Conception | Récompenses fondées sur l'effort et non la note ; pas de classement ; contenus ancrés sur le programme ; signalement des erreurs ; validation du parent | 2 | 1 |
| Conservation excessive | Absence de purge | Purges quotidiennes automatiques : photos (24 h), journal de l'effort (2 ans), comptes inactifs (24 mois + 30 jours d'avertissement) ; suppression avec le compte | 2 | 1 |
| Indisponibilité ou perte de données | Panne, erreur | Sauvegardes de l'hébergeur ; console utilisable hors connexion | 1 | 2 |

## 5. Conclusion provisoire

Avec les mesures déjà en place et celles du **plan d'action** ([README](README.md)), le risque résiduel paraît
**acceptable**. Points à valider avant le lancement public : DPA et encadrement des transferts (Anthropic,
RevenueCat, Supabase), conditions de conservation chez Anthropic,
programmation des tâches de purge.

Avis du délégué à la protection des données ou du juriste : [À COMPLÉTER]

Avis des personnes concernées (art. 35.9) : [À COMPLÉTER : par exemple retours de familles de la bêta]
