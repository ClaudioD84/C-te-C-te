# Revue de sécurité avant lancement

Revue du 5 octobre 2026 : base de données (règles par ligne, privilèges, fonctions), stockage, fonctions
serveur, application, dépendances. Les corrections sont dans la migration `20261019000000_security_hardening.sql`
et les fonctions serveur ; les attaques corrigées sont rejouées par les tests de bout en bout
(`e2e/tests/serveur.spec.ts`).

## Constats et corrections

| # | Gravité | Constat | Correction |
|---|---|---|---|
| 1 | Élevée | Un parent pouvait modifier le chemin de fichier d'une de ses numérisations pour viser la photo d'une autre famille : `scan-extract` l'aurait lue (et `purge-photos` supprimée) avec les droits d'administration. Exploitation difficile (deux identifiants aléatoires à connaître, photo conservée moins de 24 h) mais impact grave. | Contrainte en base : le chemin commence toujours par le dossier de la famille. Vérification supplémentaire dans `scan-extract`. Colonne non modifiable par le parent. |
| 2 | Moyenne (coût) | Quota mensuel de photos contournable en antidatant `processed_at` ou en remettant une numérisation à « déposée ». | Le quota est compté sur le journal de consommation de l'IA (écrit par le serveur seul). Le parent ne peut modifier que le statut, et seulement de « à vérifier » à « validée ». |
| 3 | Moyenne (coût) | Quota de fiches contournable : supprimer une fiche puis la régénérer libérait du quota. | Quota compté sur le journal de consommation. |
| 4 | Faible | Le contenu d'une fiche ou d'une carte générée était modifiable par le parent (ses propres données). | Seules les colonnes utiles sont modifiables : signalement d'erreur (fiches), suivi de révision (cartes). |
| 5 | Faible | `simulate-purchase` accorderait un abonnement gratuit s'il était déployé avec `ALLOW_SIMULATED_PURCHASES=true`. | Double verrou : la fonction refuse tout projet hébergé, quel que soit ce réglage. |
| 6 | Faible | Secrets des purges comparés sans temps constant. | Comparaison en temps constant partagée (`_shared/secret.ts`), tests. |
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
- **Dépôt** : aucun secret versionné (`functions.env` des tests ne contient que des valeurs factices).

## Risques acceptés (à revoir)

- **Dépendances** (`pnpm audit`) : `node-forge`, `braces` et `uuid` ne servent qu'aux outils de compilation
  d'Expo, pas à l'application. `decode-uri-component` (via expo-router) est embarqué : un lien profond
  volontairement malformé pourrait figer l'application (pas d'accès aux données). À mettre à jour avec le
  prochain SDK Expo.
- **Injection dans les instructions de l'IA** : un texte écrit sur une photo pourrait tenter de détourner
  l'extraction. Les réponses sont contraintes par un schéma, ne déclenchent aucune action et sont toujours
  validées par le parent.
- **Console enfant** : elle utilise la session du parent sur son appareil ; l'interface ne donne accès à rien
  d'autre, mais un appareil confié reste un appareil confié.

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
