# Procédure en cas de violation de données (art. 33 et 34)

> Projet — à compléter avec les coordonnées réelles et à relire par un juriste.

Une violation de données est un incident de sécurité qui entraîne la destruction, la perte, l'altération, la
divulgation ou l'accès non autorisé à des données personnelles (ex. fuite de la base, clé d'API exposée, accès
d'une famille aux données d'une autre).

## 1. Dès la découverte (heure 0)

1. **Noter** la date et l'heure de découverte : le délai de 72 heures court à partir de là.
2. **Contenir** : révoquer et remplacer les clés concernées (Supabase, Anthropic, RevenueCat, secrets des
   fonctions), désactiver la fonction en cause, bloquer l'accès suspect, mettre l'application en maintenance si
   nécessaire.
3. **Préserver les traces** : journaux de l'hébergeur et des fonctions, sans les modifier.

## 2. Évaluer (dans les 24 heures)

- Quelles données ? (e-mails, profils, **besoins particuliers = données de santé**, photos, tâches…)
- Combien de familles et d'enfants ?
- Les données étaient-elles chiffrées ou pseudonymisées ? (prénoms seulement, sans nom de famille ; zones des photos masquées par le parent)
- Conséquences possibles pour les personnes ?

Le risque est en principe **élevé** dès que des données de santé d'enfants sont concernées.

## 3. Notifier

- **Autorité de protection des données** : notification **dans les 72 heures** via le formulaire en ligne de
  l'APD (www.autoriteprotectiondonnees.be), sauf si la violation n'engendre aucun risque. Si toutes les
  informations ne sont pas disponibles, notifier quand même et compléter ensuite.
- **Familles concernées** : si le risque est élevé, les prévenir **sans tarder**, en langage simple (ce qui s'est
  passé, données touchées, mesures prises, conseils : changer de mot de passe…), par e-mail et dans l'application.
- **Sous-traitants** : informer et demander leurs constats si l'incident vient de chez eux (leurs DPA prévoient
  qu'ils nous préviennent sans délai).

## 4. Documenter (toujours, même sans notification)

Tenir un registre des violations : date, description, données et personnes concernées, conséquences, mesures
prises, notification (oui ou non, et pourquoi).

| Date | Description | Données | Personnes | Mesures | Notifiée à l'APD | Familles informées |
|---|---|---|---|---|---|---|
| | | | | | | |

## Contacts

- Responsable : [À COMPLÉTER]
- Juriste ou délégué à la protection des données : [À COMPLÉTER]
- Supabase (support et sécurité) : [À COMPLÉTER]
