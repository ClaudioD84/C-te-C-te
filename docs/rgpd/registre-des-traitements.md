# Registre des activités de traitement (article 30 du RGPD)

> Projet — version du 5 octobre 2026. À relire par un juriste.

## Responsable du traitement

- **Nom** : [À COMPLÉTER : nom de l'éditeur ou de la société]
- **Adresse** : [À COMPLÉTER]
- **Contact vie privée** : [À COMPLÉTER : adresse e-mail dédiée, ex. vie-privee@…]
- **Délégué à la protection des données** : [À COMPLÉTER ou « non désigné », selon l'avis du juriste]
- **Autorité de contrôle** : Autorité de protection des données (APD), rue de la Presse 35, 1000 Bruxelles.

## Personnes concernées

- **Parents** (titulaires du compte, majeurs).
- **Enfants** (de la 1re maternelle à la fin du secondaire), qui n'ont pas de compte : ils utilisent la console
  enfant sur l'appareil du parent ou un appareil confié par lui, sous son **prénom** (sans nom de famille).

## Sous-traitants et destinataires

| Prestataire | Rôle | Données | Lieu de traitement |
|---|---|---|---|
| Supabase Inc. | Hébergement de la base, des fichiers, de l'authentification et des fonctions serveur | Toutes les données du compte | Union européenne (Francfort) ; société mère aux États-Unis [vérifier le DPA et les transferts] |
| Anthropic PBC | IA : lecture des photos, préparation des fiches et quiz, dossiers de révision | Photo masquée, texte des tâches, année et type d'enseignement, consignes d'adaptation, attendus du programme. **Ni nom, ni prénom, ni e-mail, ni trouble nommé.** | États-Unis [transfert à encadrer] |
| RevenueCat Inc. | Gestion des abonnements App Store et Google Play | Identifiant technique de la famille, achats et dates | États-Unis [transfert à encadrer] |
| Apple, Google | Paiement des abonnements, distribution de l'application | Données de paiement (traitées par eux, en tant que responsables distincts) | Selon leurs conditions |
| Brevo (Sendinblue SAS, France) | E-mails de compte (confirmation, mot de passe oublié, avertissement d'inactivité) et bilan de la semaine (sur demande) | Adresse e-mail du parent ; pour le bilan : prénoms des enfants, jours, minutes et matières travaillées | Union européenne |

Aucune donnée n'est vendue, louée ni utilisée à des fins publicitaires. Aucun outil d'analyse d'audience.

## Traitements

### T1 — Compte parent

| | |
|---|---|
| Finalité | Créer et sécuriser le compte, permettre la connexion |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Données | Adresse e-mail, mot de passe (haché par Supabase Auth), date de création, date de dernière utilisation, journaux de connexion ; rattachement à la famille (les autres parents de la famille voient l'adresse e-mail) ; invitations (empreinte du code, 7 jours) et essais de codes erronés (15 minutes utiles, effacés avec le compte) |
| Conservation | Durée du compte ; suppression immédiate à la demande (depuis l'application). Compte inactif depuis 24 mois (aucune ouverture de l'application) : e-mail d'avertissement, puis suppression 30 jours plus tard sans reconnexion ; jamais pendant un abonnement payé en cours |
| Destinataires | Supabase ; prestataire d'e-mails |

### T2 — Profils enfants

| | |
|---|---|
| Finalité | Adapter l'organisation du travail et les contenus à l'année scolaire et au profil de l'enfant |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Données | Prénom (sans nom de famille), avatar, année, type d'enseignement, réseau, options, préférences (jours, durée de travail, centres d'intérêt choisis dans une liste fermée), congés et absences (dates et type, sans motif détaillé) |
| Conservation | Durée du compte ; suppression du profil ou du compte à tout moment |
| Remarque | Le nom de famille de l'enfant n'est jamais demandé ; son prénom n'est jamais envoyé à l'IA. Les prénoms des enfants et la liste des noms à masquer servent à masquer les photos sur l'appareil, avant tout envoi (liste stockée chiffrée sur l'appareil) |

### T3 — Besoins particuliers (données de santé, art. 9)

| | |
|---|---|
| Finalité | Adapter les contenus (TDAH, dyslexie, dyscalculie) : consignes courtes, police adaptée, étapes décomposées… |
| Base légale | Consentement explicite du parent (art. 9.2.a et art. 6.1.a), recueilli et horodaté dans l'application |
| Données | Besoins cochés, date du consentement |
| Minimisation | Facultatif ; les demandes envoyées à l'IA contiennent seulement les **consignes d'adaptation**, jamais le trouble |
| Conservation | Durée du profil. Retrait du consentement à tout moment dans « Modifier le profil » : les besoins et la date sont effacés. Tout besoin ajouté demande un nouvel accord |

### T4 — Photos du journal de classe et tâches scolaires

| | |
|---|---|
| Finalité | Extraire devoirs, leçons et évaluations pour organiser la semaine |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Données | Photo **masquée sur l'appareil** (noms recouverts), texte des tâches extraites (matière, description, échéance) |
| Conservation | Photo : supprimée dès l'analyse, au plus tard après 24 heures. Tâches : durée du compte |
| Destinataires | Supabase (stockage privé) ; Anthropic (lecture de la photo) |

### T5 — Fiches, quiz, cartes de révision et dossiers de révision

| | |
|---|---|
| Finalité | Préparer des supports d'étude adaptés à partir des tâches et du programme officiel |
| Base légale | Exécution du contrat (art. 6.1.b) ; pour les adaptations liées aux besoins : consentement (T3) |
| Données | Tâches, année, consignes d'adaptation, centres d'intérêt (liste fermée), contenus générés (dont les explications « autrement » d'une partie de fiche), signalements d'erreur |
| Conservation | Durée du compte |
| Destinataires | Supabase ; Anthropic |

### T6 — Suivi de l'effort et récompenses

| | |
|---|---|
| Finalité | Afficher au parent le travail accompli, faire grandir l'avatar, attribuer les badges |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Données | Activités cochées, cartes revues, résultats des quiz, sessions terminées, avec leur date |
| Conservation | 2 ans, puis effacement automatique quotidien ; au plus tard à la suppression du compte |
| Remarque | Pas de classement entre enfants, pas de comparaison avec d'autres familles |

### T7 — Abonnement

| | |
|---|---|
| Finalité | Gérer l'essai gratuit, l'abonnement et les droits d'accès |
| Base légale | Exécution du contrat (art. 6.1.b) ; obligations comptables pour les justificatifs (art. 6.1.c) |
| Données | Formule, état, dates, store, identifiant de produit, historique des avis de RevenueCat |
| Conservation | Durée du compte ; [À VÉRIFIER : durée légale de conservation des justificatifs] |
| Destinataires | RevenueCat ; Apple ou Google (paiement) |

### T8 — Suivi des coûts de l'IA

| | |
|---|---|
| Finalité | Respecter les quotas mensuels et suivre les coûts |
| Base légale | Intérêt légitime (art. 6.1.f) : maîtrise des coûts du service |
| Données | Fonction appelée, modèle, nombre de jetons, coût, date (aucun contenu) |
| Conservation | Durée du compte |

### T9 — Données gardées sur l'appareil

| | |
|---|---|
| Finalité | Console enfant utilisable hors connexion ; code parent ; rappels |
| Données | Copie temporaire de la mission, des fiches et des cartes (7 jours) ; actions en attente d'envoi ; code parent haché ; noms à masquer (stockage chiffré) ; réglages des rappels |
| Conservation | Effacées à la déconnexion et à la suppression du compte |
| Remarque | Les rappels sont des notifications locales : aucun identifiant de notification n'est envoyé au serveur |

### T11 — Échanges parent-enfant dans l'application

| | |
|---|---|
| Finalité | Encourager l'enfant (petit mot du parent), l'entraîner à la dictée préparée, prévenir le parent quand l'enfant bloque (« J'ai besoin d'aide ») |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Données | Texte du petit mot (200 caractères), dates d'envoi et de lecture ; mots de la dictée de la semaine ; demandes d'aide (activité concernée, dates). Jamais envoyés à l'IA |
| Remarque | « Je récite » : l'enregistrement de la voix reste sur l'appareil, le temps de la séance ; il n'est jamais envoyé ni conservé. La « météo » de l'enfant (comment il se sent) et sa couleur préférée restent sur l'appareil, pour la journée pour la météo : ni envoyées au serveur ni montrées au parent |
| Conservation | Durée du profil ; supprimés avec le profil ou le compte |
| Destinataires | Supabase |

### T10 — Tablette de l'enfant

| | |
|---|---|
| Finalité | Relier une tablette au profil d'un enfant pour qu'elle n'affiche que sa console |
| Base légale | Exécution du contrat (art. 6.1.b) ; protection contre les essais de codes : intérêt légitime (art. 6.1.f) |
| Données | Nom donné à la tablette, dates de liaison et de dernière utilisation ; compte technique sans adresse réelle ; codes de liaison (empreinte seulement, 15 minutes) ; essais de codes erronés (empreinte de l'adresse IP, 1 jour) |
| Conservation | Jusqu'au retrait de la tablette (par le parent ou la tablette), à la suppression du profil ou du compte ; le compte technique est alors supprimé |
| Destinataires | Supabase |

## Mesures de sécurité

- Chiffrement des échanges (HTTPS) et des données au repos (hébergeur).
- Sécurité au niveau des lignes (RLS) sur toutes les tables : un parent n'accède qu'aux données de sa famille ;
  tests automatisés de cloisonnement.
- Clés d'API uniquement côté serveur ; fonctions protégées par jeton de session ou secret partagé.
- Tablette de l'enfant : compte distinct limité par RLS à la console de cet enfant, sans accès à l'espace
  parent ; liaison par code à usage unique de 15 minutes, essais limités.
- Code parent pour quitter la console enfant ; stockage chiffré sur l'appareil pour les données sensibles.
- Sauvegardes de l'hébergeur [À COMPLÉTER : durée selon l'offre Supabase choisie].
- Procédure de gestion des violations de données : [violation-de-donnees.md](violation-de-donnees.md).
