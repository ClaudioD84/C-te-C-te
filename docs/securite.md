# Revue de sécurité avant lancement

Revue du 5 octobre 2026 : base de données (règles par ligne, privilèges, fonctions), stockage, fonctions
serveur, application, dépendances. Les corrections sont dans la migration `20261019000000_security_hardening.sql`
et les fonctions serveur ; les attaques corrigées sont rejouées par les tests de bout en bout
(`e2e/tests/serveur.spec.ts`).

Seconde revue le 6 octobre 2026, sur les ajouts suivants (tablette de l'enfant, plusieurs parents, petits mots,
demandes d'aide, dictées, explications, bilan par e-mail, parrainage) : constats 8 et 9, corrigés dans
`20261102000000_security_fixes.sql`. Vérifié aussi : RLS active sur toutes les tables, aucun privilège pour
les visiteurs non connectés, fonctions privilégiées exécutables seulement par le rôle prévu.

## Constats et corrections

| # | Gravité | Constat | Correction |
|---|---|---|---|
| 1 | Élevée | Un parent pouvait modifier le chemin de fichier d'une de ses numérisations pour viser la photo d'une autre famille : `scan-extract` l'aurait lue (et `purge-photos` supprimée) avec les droits d'administration. Exploitation difficile (deux identifiants aléatoires à connaître, photo conservée moins de 24 h) mais impact grave. | Contrainte en base : le chemin commence toujours par le dossier de la famille. Vérification supplémentaire dans `scan-extract`. Colonne non modifiable par le parent. |
| 2 | Moyenne (coût) | Quota mensuel de photos contournable en antidatant `processed_at` ou en remettant une numérisation à « déposée ». | Le quota est compté sur le journal de consommation de l'IA (écrit par le serveur seul). Le parent ne peut modifier que le statut, et seulement de « à vérifier » à « validée ». |
| 3 | Moyenne (coût) | Quota de fiches contournable : supprimer une fiche puis la régénérer libérait du quota. | Quota compté sur le journal de consommation. |
| 4 | Faible | Le contenu d'une fiche ou d'une carte générée était modifiable par le parent (ses propres données). | Seules les colonnes utiles sont modifiables : signalement d'erreur (fiches), suivi de révision (cartes). |
| 5 | Faible | `simulate-purchase` accorderait un abonnement gratuit s'il était déployé avec `ALLOW_SIMULATED_PURCHASES=true`. | Double verrou : la fonction refuse tout projet hébergé, quel que soit ce réglage. |
| 6 | Faible | Secrets des purges comparés sans temps constant. | Comparaison en temps constant partagée (`_shared/secret.ts`), tests. |
| 8 | Faible (disponibilité) | `my_referral_code` : deux appels simultanés pour la même famille faisaient boucler le second indéfiniment (conflit sur la famille pris pour un conflit sur le code). | Le code existant est relu à chaque tentative, 10 tentatives au plus ; test de demandes simultanées. |
| 9 | Faible | Une demande d'aide pouvait viser la tâche d'un frère ou d'une sœur (même famille) : pas de fuite, mais incohérence. | Déclencheur : la tâche appartient à l'enfant de la demande ; testé depuis la tablette. |
| 7 | Info | Privilèges `TRUNCATE`, `TRIGGER`, `REFERENCES` accordés par défaut aux rôles de l'API (non exploitables via l'API). | Retirés par prudence, y compris pour les futures tables. |

## Points vérifiés sans problème

- **Règles par ligne** activées sur toutes les tables ; chaque table familiale est filtrée sur la famille de
  l'utilisateur, en lecture comme en écriture. Tables de référence en lecture seule. Historique des abonnements
  inaccessible aux clients. Vue de coûts en mode « invoker » et non exposée.
- **Fonctions SQL privilégiées** : `search_path` vide, exécution réservée au bon rôle.
- **Stockage** : compartiment privé, images uniquement, 10 Mo maximum, accès limité au dossier de la famille.
- **Fonctions serveur** : jeton vérifié, appartenance des tâches, profils et numérisations à la famille contrôlée
  avant toute lecture avec les droits d'administration ; entrées validées (zod) ; messages d'erreur sans détail
  technique ; webhook RevenueCat authentifié et idempotent ; purges fermées sans secret.
- **Application** : aucune clé secrète dans le code ni dans le paquet web (seule la clé publique Supabase) ;
  code parent haché et salé dans le stockage chiffré, blocage progressif après 5 erreurs, réinitialisation par
  le mot de passe du compte ; données hors connexion effacées à la déconnexion.
- **Tablette de l'enfant** : compte distinct (créé par `pair-device`, adresse réservée
  `@appareils.coteacote.invalid`, sans famille de parent). Règles RLS dédiées : lecture limitée au profil, aux
  tâches, sessions, fiches, cartes, épreuves et événements de **son** enfant ; écriture limitée à cocher une
  activité, réviser une carte et ajouter un événement (un déclencheur refuse toute autre modification de
  session). Pas d'accès aux autres enfants, aux photos, à l'abonnement ni aux fonctions parent ; `generate-pack`
  accepté pour ses tâches, sans régénération. Code de liaison à usage unique (empreinte SHA-256, 15 minutes,
  5 en cours par famille). Retrait par le parent, par la tablette ou avec le profil : le compte est supprimé et
  la tablette se déconnecte en effaçant ses données locales. Couvert par `e2e/tests/tablette.spec.ts`.
- **Plusieurs parents** : invitation par code à usage unique (empreinte SHA-256, 7 jours, 3 en cours par
  famille), 10 essais erronés par quart d'heure et par compte. Rejoindre une famille est refusé si son compte a
  déjà des enfants ou un abonnement payé (rien n'est fusionné ni perdu) ; 4 parents au plus. Un parent retiré
  repart avec une famille vide sans nouvel essai gratuit. Couvert par `e2e/tests/famille.spec.ts`.
- **Parrainage** : codes de 8 caractères, essais erronés limités (10 par quart d'heure et par compte), une
  seule utilisation par famille, seulement dans les 30 jours après l'inscription, jamais son propre code ;
  10 récompenses par an au plus pour une marraine (limite l'intérêt de créer de faux comptes).
- **Dépôt** : aucun secret versionné (`functions.env` des tests ne contient que des valeurs factices).

## Risques acceptés (à revoir)

- **Dépendances** (`pnpm audit`) : `node-forge`, `braces` et `uuid` ne servent qu'aux outils de compilation
  d'Expo, pas à l'application. `decode-uri-component` (via expo-router) est embarqué : un lien profond
  volontairement malformé pourrait figer l'application (pas d'accès aux données). À mettre à jour avec le
  prochain SDK Expo.
- **Injection dans les instructions de l'IA** : un texte écrit sur une photo pourrait tenter de détourner
  l'extraction. Les réponses sont contraintes par un schéma, ne déclenchent aucune action et sont toujours
  validées par le parent.
- **Console enfant sur le téléphone du parent** : elle utilise la session du parent ; l'interface ne donne
  accès à rien d'autre, mais un appareil confié reste un appareil confié. Pour une tablette laissée à
  l'enfant, préférer la **tablette reliée** (ci-dessous).
- **Essais de codes de liaison** : la limite de 10 erreurs par quart d'heure repose sur l'adresse IP transmise
  (`x-forwarded-for`), qui peut être falsifiée ; le plafond global (500 erreurs par quart d'heure) reste
  inviolable. Avec 31⁸ codes possibles valables 15 minutes, deviner un code reste hors de portée ; au pire,
  un attaquant bloque temporairement les liaisons.

- **Effort déclaré par l'enfant** : la console (téléphone ou tablette) enregistre elle-même les activités,
  cartes, quiz et lectures. Un enfant pourrait en ajouter de faux : cela ne touche que ses propres badges,
  accessoires et bilans, jamais les données d'autres enfants.
- **Parrainage** : créer de faux comptes rapporte au plus 10 mois par an à une marraine en essai (comptes à
  confirmer par e-mail en production).

## Réglages de production à faire (Supabase)

1. Authentication > Sign In / Providers > Email : **confirmation de l'adresse e-mail activée** (évite la création
   de comptes en masse pour profiter de l'essai), mot de passe de 8 caractères minimum.
2. Authentication > Attack Protection : **CAPTCHA** (hCaptcha ou Cloudflare Turnstile) si des inscriptions
   abusives apparaissent, et protection contre les mots de passe divulgués (offre Pro).
3. Authentication > Rate Limits : garder les limites par défaut (inscriptions, e-mails, connexions).
4. Ne **pas** déployer `simulate-purchase` ; ne pas définir `ALLOW_SIMULATED_PURCHASES`.
5. Secrets forts et distincts pour `PURGE_SECRET` et `REVENUECAT_WEBHOOK_SECRET` (32 caractères aléatoires).
6. Database > Backups : vérifier les sauvegardes quotidiennes ; activer la restauration à un instant donné si
   l'offre le permet.
7. Advisors (Security Advisor) du tableau de bord : aucun avertissement attendu ; à consulter après chaque
   migration.
