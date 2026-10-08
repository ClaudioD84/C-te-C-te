# Dossier RGPD de Côte à Côte

> **Projet de travail, à faire relire par un juriste** avant le lancement public (exigence 6.1 du cahier des
> charges). Ces documents décrivent le fonctionnement réel de l'application à la date indiquée ; ils doivent être
> mis à jour à chaque nouvelle fonctionnalité qui touche aux données. Les passages **[À COMPLÉTER]** attendent une
> information ou une décision de l'éditeur.

Version du 5 octobre 2026.

| Document | Rôle |
|---|---|
| [Registre des traitements](registre-des-traitements.md) | Obligation de l'article 30 : quelles données, pourquoi, combien de temps, qui y accède |
| [Analyse d'impact (AIPD)](aipd.md) | Obligatoire ici : données de santé et données d'enfants, traitées avec de l'IA |
| [Politique de confidentialité](politique-de-confidentialite.md) | Texte destiné aux parents (projet) |
| [Déclarations des stores](declarations-stores.md) | Réponses aux questionnaires « App Privacy » (Apple) et « Sécurité des données » (Google) |
| [Violation de données](violation-de-donnees.md) | Procédure en cas de fuite (notification à l'APD sous 72 heures) |

## Ce qui est déjà en place dans l'application

- Enfants identifiés par leur **prénom** seulement (jamais de nom de famille) ; le prénom n'est jamais transmis à l'IA par l'application.
- Besoins particuliers (TDAH, dyslexie, dyscalculie) enregistrés **seulement après consentement explicite et
  horodaté** du parent ; le trouble n'est **jamais nommé** dans les demandes envoyées à l'IA (seules les
  adaptations de rédaction le sont).
- Photos du journal de classe : **pas de masquage** (une photo peut montrer des noms) ; l'IA a pour consigne de
  ne recopier aucun nom de personne ni d'école ; photo **supprimée dès l'analyse**, et au plus tard après
  24 heures (purge automatique).
- Hébergement des données dans l'**Union européenne** (Supabase, Francfort).
- Cloisonnement strict par famille (sécurité au niveau des lignes de la base, testée).
- **Export** de toutes les données de la famille et **suppression** complète du compte depuis l'application.
- **Modification** d'un profil enfant et **retrait du consentement** (en décochant les besoins), **suppression**
  d'un profil et de toutes ses données.
- Aucune publicité, aucun outil de mesure d'audience, aucun traceur tiers.
- **Durées de conservation appliquées automatiquement** : journal de l'effort effacé après 2 ans ; compte
  inactif depuis 24 mois averti par e-mail puis supprimé 30 jours plus tard s'il ne se reconnecte pas.
- Rappels : notifications locales, sans serveur d'envoi ni identifiant publicitaire.

## Plan d'action avant le lancement public

| # | Action | Responsable | Statut |
|---|---|---|---|
| 1 | Désigner le responsable du traitement (personne physique ou société), compléter les coordonnées | Éditeur | [À COMPLÉTER] |
| 2 | Signer les accords de sous-traitance (DPA) : Supabase, Anthropic, RevenueCat | Éditeur | À faire |
| 3 | Transferts hors UE (Anthropic, RevenueCat, maison mère de Supabase) : vérifier l'adhésion au *Data Privacy Framework* UE–États-Unis ou signer les clauses contractuelles types ; documenter l'évaluation des transferts | Éditeur + juriste | À faire |
| 4 | Anthropic : vérifier la durée de conservation des requêtes de l'API et demander, si possible, la conservation zéro (*zero data retention*) ; s'assurer que les données ne servent pas à l'entraînement | Éditeur | À faire |
| 5 | Programmer la purge quotidienne des photos (fonction `purge-photos`, secret `PURGE_SECRET`, tâche planifiée Supabase) | Développement | Code prêt |
| 6 | Écran de modification du profil enfant (rectification, retrait du consentement aux besoins particuliers) | Développement | Fait |
| 7 | Conservation : supprimer les comptes inactifs depuis 24 mois (après avertissement par e-mail) et les événements d'effort de plus de 2 ans (fonction `purge-inactive`, tâche quotidienne) | Développement | Fait (à programmer) |
| 7 bis | Programmer le bilan de la semaine par e-mail (fonction `weekly-recap`, dimanche vers 19 h, même secret `PURGE_SECRET`) : envoyé seulement aux parents qui l'ont demandé | Développement | Fait (à programmer) |
| 8 | Ouvrir le compte Brevo (formule gratuite, 300 e-mails par jour), valider l'adresse d'expéditeur et le domaine, accepter son accord de sous-traitance : SMTP pour les e-mails de connexion (Supabase Auth) et clé d'API pour l'avertissement des comptes inactifs | Éditeur | Prestataire choisi |
| 9 | Faire relire l'AIPD, la politique de confidentialité et les conditions d'utilisation par un juriste, en particulier l'envoi des photos **sans masquage** (noms possibles) au fournisseur d'IA | Éditeur | À faire |
| 10 | Publier la politique de confidentialité et les conditions (liens exigés par Apple et Google) | Éditeur | À faire |
| 11 | Délégué à la protection des données : évaluer l'obligation (données de santé « à grande échelle » ?) avec le juriste | Éditeur + juriste | À faire |
| 12 | Choisir la catégorie des stores : « Éducation » (application destinée aux parents), pas « Enfants » | Éditeur | Recommandé |
