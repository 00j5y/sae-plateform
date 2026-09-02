# Conception : plateforme privée de gestion des SAE

**Date :** 2 septembre 2026

**Statut :** validée par Jay

**Cible :** une équipe privée d'étudiants en BUT Informatique

## 1. Objectif

Créer une plateforme web pour organiser le développement de plusieurs SAE. Discord reste l'outil de communication de l'équipe. La plateforme devient la source de vérité pour les projets, tâches, calendrier, pièces jointes et activité GitHub.

La première livraison doit être utilisable avant le début des SAE. Elle couvre toutes les fonctionnalités définies dans ce document, sans fonctionnalités d'écriture dans GitHub, système de notes indépendant ni bot Discord.

## 2. Utilisateurs et accès

La plateforme comporte une seule équipe privée.

### Authentification Discord

1. L'utilisateur se connecte avec OAuth Discord.
2. À cette première connexion, la plateforme crée ou met à jour son profil avec son identifiant Discord immuable, son pseudo, son nom affiché et son avatar.
3. Un nouveau compte est placé en statut `pending` et ne peut accéder à aucune donnée de la plateforme.
4. Un membre `active` recherche ce profil déjà connecté puis active son accès à la plateforme.
5. Une fois actif, le membre peut être ajouté aux SAE de son équipe.

Le tout premier compte actif est configuré à l'installation avec l'identifiant Discord de Jay. Il ne crée aucune hiérarchie fonctionnelle après l'initialisation.

### Égalité dans les SAE

Tout membre d'une SAE dispose des mêmes droits dans cette SAE :

- ajouter ou retirer des membres de la SAE parmi les membres actifs de la plateforme ;
- modifier les informations du projet et son dépôt GitHub ;
- créer, modifier, déplacer ou supprimer des tâches ;
- créer, modifier ou supprimer les événements du calendrier ;
- créer ou supprimer commentaires et images selon leur appartenance au projet.

Les suppressions de projet, de membre, de commentaire ou d'image exigent une confirmation. L'historique rend les modifications attribuables à leur auteur, sans créer de rôle de chef d'équipe.

Les colonnes appartiennent au Kanban commun, et non à une SAE. Elles peuvent donc être gérées par tout membre `active` de la plateforme. Ce droit est identique pour toute l'équipe et ne crée pas de rôle particulier.

## 3. Fonctionnalités

### 3.1 SAE

Chaque SAE contient :

- un nom, une description, une couleur et des dates de début et fin ;
- un dépôt GitHub unique ;
- une liste de membres ;
- des tâches et événements ;
- une page de consultation GitHub ;
- un journal des actions importantes.

Un nouveau projet est créé avec son créateur comme seul membre. Les autres membres sont ajoutés après création.

### 3.2 Kanban commun

Il existe un Kanban d'équipe unique. Toute tâche appartient à une SAE mais les tâches sont présentées sur le même tableau. Une barre de filtres permet d'afficher une, plusieurs ou toutes les SAE, et de filtrer par membre, colonne, échéance, couleur ou recherche textuelle.

Les colonnes initiales sont : `Backlog`, `À faire`, `En cours`, `À tester` et `Terminé`. Le workflow reste commun à l'équipe. Les membres peuvent gérer les colonnes communes si nécessaire.

Chaque tâche possède :

- une SAE obligatoire ;
- un titre et une description ;
- une colonne et une position dans cette colonne ;
- une couleur ;
- zéro, un ou plusieurs membres associés ;
- une date limite facultative ;
- des commentaires datés et attribués ;
- des images privées de preuve, de capture ou de maquette.

Le déplacement d'une carte est immédiat. Les changements sont visibles pour les autres membres après actualisation des données en temps réel.

### 3.3 Calendrier global

Le calendrier global regroupe les éléments de toutes les SAE. Il prend en charge les vues mois, semaine et liste, et une zone de filtres par SAE, type d'événement, membre, état et mot-clé.

Types d'événements :

- période de développement ;
- période de tests ;
- période de correction de bugs ;
- réunion ;
- échéance ou rendu.

Les tâches ayant une date limite apparaissent aussi automatiquement dans le calendrier. La page d'une SAE affiche une version filtrée de ce même calendrier.

### 3.4 Commentaires et images

Les commentaires dans les cartes remplacent l'espace de notes. Ils servent aux décisions, explications, retours de test et échanges sur une tâche.

Les images jointes sont enregistrées dans un bucket Supabase privé. Seuls les membres de la SAE concernée peuvent les téléverser, consulter ou supprimer, selon les règles de sécurité de la base.

### 3.5 Consultation GitHub

Une GitHub App est installée seulement sur le dépôt choisi pour chaque SAE. Elle reçoit uniquement les autorisations de lecture nécessaires.

La page GitHub d'une SAE affiche :

- les branches ;
- les commits récents ;
- les pull requests ;
- les issues.

Les informations sont synchronisées par webhooks GitHub signés. Une actualisation de secours peut être lancée depuis l'interface. Les données restent en lecture seule : la plateforme ne crée, ne modifie ni ne fusionne de contenu GitHub.

En cas d'échec, la dernière synchronisation connue est affichée avec son horodatage, un état d'erreur compréhensible et une action de relance.

## 4. Écrans et navigation

L'interface est pensée d'abord pour ordinateur et reste responsive pour une consultation confortable sur mobile.

- **Vue d'ensemble** : accueil prioritaire. Elle affiche le calendrier global, les urgences, les pull requests ouvertes et un résumé du Kanban. C'est le choix visuel validé par Jay.
- **Kanban commun** : tableau de toutes les tâches et barre de filtres globale.
- **Calendrier** : calendrier global détaillé et filtres.
- **Mes SAE** : liste des projets, création d'une SAE et accès à leurs pages détaillées.
- **Membres** : comptes actifs et en attente, avec activation des comptes déjà connectés via Discord.
- **Page d'une SAE** : informations du projet, membres, vue filtrée du Kanban, calendrier filtré et données GitHub.

### 4.1 Direction visuelle et interactions

L'interface suit une direction moderne inspirée des principes Apple : calme, claire et attentive aux détails, sans imitation littérale d'une interface Apple.

- **Hiérarchie** : la vue d'ensemble met d'abord en avant calendrier, priorités et activité. Les actions secondaires restent accessibles un niveau plus bas.
- **Typographie** : police système de la plateforme, tailles et espacements en unités relatives, titres compacts et corps de texte confortable. La typographie s'adapte aux préférences de taille de l'utilisateur.
- **Couleurs** : une couleur d'accent violette est réservée aux actions principales. Les couleurs de SAE identifient les projets dans le Kanban et le calendrier. Elles ne doivent jamais être le seul moyen de transmettre une information.
- **Matières et profondeur** : barre supérieure et navigation latérale discrètement translucides. Les cartes de contenu restent opaques pour ne pas empiler les effets de transparence et préserver la lisibilité.
- **Mouvement** : retour visuel immédiat à la pression, glisser-déposer des cartes avec suivi 1:1 du pointeur, transitions courtes par ressort sans rebond sur les actions ordinaires. Les animations restent interruptibles et démarrent depuis l'état affiché.
- **Feedback** : états de chargement, succès, avertissement et erreur sont explicites. Une action destructrice conserve une confirmation, les actions réversibles privilégient une annulation rapide quand elle est possible.
- **Accessibilité** : prise en charge de `prefers-reduced-motion`, `prefers-reduced-transparency` et `prefers-contrast`, navigation clavier, focus visible, cibles tactiles confortables et contrastes suffisants.
- **Thèmes et appareils** : thème clair ou sombre synchronisé à la préférence système avec un sélecteur manuel. Le bureau conserve la densité nécessaire au Kanban, le mobile privilégie consultation, filtres et détail des cartes.

## 5. Architecture retenue

### Choix

Option A retenue : Next.js full-stack avec Supabase et Vercel.

| Élément | Choix | Rôle |
| --- | --- | --- |
| Frontend et API | Next.js App Router, React, TypeScript | Interface, routes serveur, webhooks |
| Outils locaux | Bun | Installation, scripts, tests et développement |
| Hébergement | Vercel | Prévisualisations et production |
| Authentification | Supabase Auth avec Discord OAuth | Session sécurisée et identité Discord |
| Données | Supabase PostgreSQL | Données relationnelles et politiques RLS |
| Fichiers | Supabase Storage privé | Images jointes aux tâches |
| GitHub | GitHub App en lecture seule | Dépôt, branches, commits, PR et issues |

Vercel utilisera Bun pour le gestionnaire de dépendances. La première mise en ligne gardera le runtime serveur Node.js de Vercel pour privilégier la stabilité des intégrations. Le runtime Bun sur Vercel pourra être évalué après la V1.

### Limites de sécurité

- Les clés Supabase sensibles, le secret OAuth Discord, les clés de la GitHub App et les secrets de webhooks sont stockés exclusivement dans les variables d'environnement Vercel et Supabase.
- Les routes serveur vérifient la session et les appartenances avant toute action.
- Les politiques RLS Supabase reproduisent les mêmes contrôles directement dans PostgreSQL et Storage. Un client ne peut contourner les règles applicatives.
- Les webhooks GitHub vérifient leur signature avant traitement.
- Les images acceptent seulement des formats autorisés et une taille maximale définie. Les noms de fichier ne déterminent jamais les droits d'accès.

## 6. Modèle de données

Tables principales :

- `profiles` : identité applicative liée à `auth.users`, identifiant Discord, pseudo, nom affiché, avatar et statut `pending` ou `active` ;
- `projects` : SAE et son dépôt GitHub unique ;
- `project_members` : appartenance d'un profil à une SAE ;
- `kanban_columns` : colonnes partagées et leur ordre ;
- `tasks` : carte, colonne, position, couleur, contenu et échéance ;
- `task_assignees` : relation plusieurs-à-plusieurs entre tâches et membres ;
- `task_comments` : messages associés aux cartes ;
- `task_attachments` : métadonnées des images privées ;
- `calendar_events` : périodes, réunions et échéances ;
- `github_repositories` : configuration d'un dépôt par SAE ;
- `github_sync_state` : état, date et erreur de synchronisation ;
- `activity_logs` : auteur, action, cible et date.

Les tables de cache GitHub pourront stocker les snapshots de branches, commits, pull requests et issues pour limiter les appels API et afficher les dernières données connues lors d'une indisponibilité temporaire.

## 7. Flux des données

1. OAuth Discord fournit l'identité à Supabase Auth et initialise le profil `pending`.
2. Une activation transforme ce profil en membre `active` de la plateforme.
3. Les données liées à une SAE sont accessibles seulement après contrôle de `project_members`.
4. La création ou l'édition d'une tâche met à jour le Kanban et, si une date limite existe, le calendrier global.
5. Les événements manuels alimentent le même calendrier global.
6. Un webhook GitHub met à jour le cache de la SAE concernée ; l'interface lit ce cache et indique sa fraîcheur.
7. Les images sont téléversées dans Storage puis référencées par `task_attachments` après validation des droits.

## 8. Gestion des erreurs

- Échec OAuth : retour vers la connexion avec une explication simple et sans détail de secret.
- Profil en attente : écran explicitant que l'accès doit être activé par un camarade.
- Droits insuffisants : réponse `403` et interface sans données privées.
- GitHub indisponible ou dépôt non autorisé : dernière donnée connue, horodatage, état visible et relance manuelle.
- Échec d'image : validation du type et de la taille, sans créer de pièce jointe partielle.
- Conflit de réorganisation : la dernière opération valide est conservée, suivie d'un rafraîchissement du tableau.

## 9. Tests et critères d'acceptation

### Tests automatisés

- tests unitaires des règles métier, filtres, positions Kanban et autorisations ;
- tests d'intégration des politiques RLS, routes sécurisées, OAuth simulé et validation de webhooks GitHub ;
- tests de parcours navigateur : connexion, attente d'activation, activation, création de SAE, ajout de membre, création et déplacement de carte, commentaire, image et filtrage du calendrier.

### Critères de livraison

- un compte Discord non activé ne lit aucune donnée ;
- un membre actif peut créer une SAE et ajouter un autre membre actif ;
- chaque membre d'une SAE dispose des mêmes actions ;
- le Kanban commun se filtre correctement par une ou plusieurs SAE ;
- les commentaires et images restent invisibles hors de leur SAE ;
- les échéances de tâches et événements apparaissent dans le calendrier global filtrable ;
- branches, commits, PR et issues du dépôt configuré sont consultables depuis la SAE ;
- le site fonctionne sur ordinateur et permet une consultation lisible sur téléphone ;
- un déploiement Vercel se construit depuis la branche `main`.

## 10. Hors périmètre de cette première livraison

- bot Discord et synchronisation de liste de membres Discord ;
- système de notes autonome ;
- création, modification ou fusion de contenu GitHub ;
- notifications Discord automatiques ;
- rôles hiérarchiques au sein d'une SAE ;
- multi-équipe ou ouverture publique de la plateforme.
