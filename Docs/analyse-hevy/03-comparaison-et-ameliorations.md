# Comparaison Hevy vs SportTracker — et améliorations

> Croise [01-inventaire-sporttracker.md](01-inventaire-sporttracker.md) (code réel, preuves fichier:ligne) et [02-features-hevy.md](02-features-hevy.md) (features produit Hevy). Périmètre exclu : monétisation, social, coach/client.
>
> Statuts : **DÉJÀ LÀ** (implémenté et fonctionnel) · **PARTIELLE** (présent mais incomplet / dégradé vs Hevy) · **ABSENTE** (aucune trace dans le code).

## 1. Tableau comparatif

### Exercices

| Feature Hevy | Statut | Preuve SportTracker |
|---|---|---|
| Bibliothèque d'exercices filtrable (muscle + équipement) | **PARTIELLE** | 1324 exercices seedés, filtrage par `MuscleGroup` uniquement — `SportTracker.Data\Seed\ExerciseSeeder.cs:8-52`, `SportTracker.Core\Enums\MuscleGroup.cs:3-14`. Aucun champ "équipement" sur `Exercise` — `SportTracker.Core\Models\Exercise.cs:5-13`. |
| Vidéos de démonstration HD | **PARTIELLE** | `GifUrl` (GIF statique, pas vidéo) affiché dans `ExerciseLive.razor:34-40,146-159`. |
| Exercices personnalisés (créés par l'utilisateur) | **PARTIELLE** | `POST /api/exercises` existe côté API — `SportTracker.Api\Controllers\ExerciseController.cs:33-38` — mais aucune page/formulaire UI de création n'est listée dans l'inventaire (section 1 UI ne mentionne que `ExerciseLive`/`ExerciseHistory`). Backend seul. |
| Options de programmation par exercice (unités, type de série par défaut) | **ABSENTE** | `Exercise` n'a que `Id/Name/Type/MuscleGroups/GifUrl/InstructionsFr` — `Exercise.cs:5-13`, aucun champ config. |
| Historique complet par exercice | **DÉJÀ LÀ** | `GET /api/exercises/{id}/history` — `ExerciseController.cs:40-77` ; page `ExerciseHistory.razor:1-160`. |

### Routines / Programmes

| Feature Hevy | Statut | Preuve SportTracker |
|---|---|---|
| Planificateur de routines (création, séances, exercices ciblés) | **DÉJÀ LÀ** | `WorkoutProgram`/`WorkoutProgramSession`/`WorkoutProgramExercise` avec schéma cible (`TargetSets`, `TargetRepsMin/Max`, `RestSeconds`) — `SportTracker.Core\Models\WorkoutProgramExercise.cs:3-15` ; UI `NewProgram.razor`, `ProgramSessionDetail.razor:1-273`. |
| Dossiers pour organiser les routines | **ABSENTE** | `WorkoutProgram` n'a pas de notion de dossier/catégorie — `WorkoutProgram.cs:5-13`. |
| Bibliothèque de routines prédéfinies (fournies par l'app) | **ABSENTE** | Le seed au démarrage ne couvre que `Exercise` (`ExerciseSeeder.cs`), aucun seed de `WorkoutProgram`. |
| Nombre illimité de routines | **DÉJÀ LÀ** | Aucune limite dans `WorkoutProgramRepository`/`WorkoutProgramController` — `SportTracker.Data\Repository\WorkoutProgramRepository.cs:16-63`. |
| Calendrier d'entraînement (planning à venir) | **ABSENTE** | `Today.razor` ne fait que suggérer la reprise de la dernière séance, pas de planning futur — `Today.razor:161-222`. Aucune entité de planification trouvée. |
| Synchronisation vers montres connectées | **ABSENTE** | Aucune intégration wearable dans le code (PWA web only, section 8). |

### Journalisation (logging de séance)

| Feature Hevy | Statut | Preuve SportTracker |
|---|---|---|
| Démarrage à vide ou depuis une routine | **PARTIELLE** | Depuis routine : "Démarrer en live" — `ProgramSessionDetail.razor:105`. À vide : uniquement via formulaire classique `NewWorkoutSession.razor` (pas d'expérience "live" sans routine) — `NewWorkoutSession.razor:1-100`. |
| Ajout/suppression de séries pendant la séance | **PARTIELLE** | Ajout dynamique de séries dans `NewWorkoutSession.razor` et validation série dans `ExerciseLive.razor:349-374` ; aucune preuve de suppression de série en cours de séance live dans l'inventaire. |
| Types de séries (Warmup, Normal, Drop set, Failure, Superset) | **ABSENTE** | `ExerciseSet` = `Weight` (double) + `Repetitions` (int) seulement, aucun champ type — `SportTracker.Core\Models\ExerciseSet.cs:3-10`. |
| Supersets | **ABSENTE** | Pas de structure de regroupement d'exercices au-delà de `WorkoutExercise` simple — `WorkoutExercise.cs:3-11`. |
| Valeurs de la séance précédente affichées | **DÉJÀ LÀ** | "Historique dernière fois" affiché dans `ExerciseLive.razor` (écran séance live) — inventaire section 1, ligne 21. |
| Notes personnalisées par exercice | **ABSENTE** | Aucun champ `Notes` sur `WorkoutExercise` ou `ExerciseSet`. |
| Minuteur de repos automatique personnalisable | **DÉJÀ LÀ** | `RestSeconds` sur `WorkoutProgramExercise` — `WorkoutProgramExercise.cs:3-15` ; minuteur circulaire pré-rempli — `ExerciseLive.razor:246` (dial lignes 121-144). |
| RPE (intensité perçue) | **ABSENTE** | Aucun champ RPE dans `ExerciseSet` ou ailleurs. |
| Calculateur de poids d'échauffement | **ABSENTE** | Aucune trace dans le code. |
| Calculateur de disques (plate calculator) | **ABSENTE** | Aucune trace dans le code. |
| Calcul automatique du 1RM | **DÉJÀ LÀ** | Formule d'Epley — `ExerciseLive.razor:214` ; affiché aussi dans `ExerciseHistory.razor`. |
| Notification de record personnel en direct | **ABSENTE** | Confirmé explicitement par l'inventaire : "Pas de calcul de records par exercice (PR) en dehors du 1RM estimé" — inventaire section 6, ligne 84. |
| Live Activity (écran verrouillé) | **ABSENTE** | PWA web uniquement, pas d'intégration iOS native — section 8. |
| Sauvegarde automatique / sync en cas de perte de connexion | **PARTIELLE** | Le service worker cache les assets statiques en cache-first (`SportTracker.App\wwwroot\service-worker.published.js:1-61`), mais aucune preuve d'autosave/sync des données de séance en cours (brouillon local, reprise après coupure réseau). |
| Paramètres de séance personnalisables (12 chez Hevy) | **ABSENTE** | Seul `WeeklyGoalService` (objectif hebdo, `localStorage`) existe — `SportTracker.App\Services\WeeklyGoalService.cs:20-125` — pas de paramètres au niveau séance. |

### Statistiques & progression

| Feature Hevy | Statut | Preuve SportTracker |
|---|---|---|
| Suivi de progression global | **DÉJÀ LÀ** | `Progress.razor:126-149`, `Today.razor:197-220`. |
| Graphiques de performance par exercice (volume, meilleur poids, reps totales) | **PARTIELLE** | `ExerciseHistory.razor` n'a qu'un graphique d'évolution du 1RM estimé — inventaire section 1, ligne 22. Pas de graphique volume/meilleur poids/reps totales séparé. |
| Graphique de répartition musculaire | **ABSENTE** | Aucune trace de ce type de graphique dans les pages stats listées (`Today.razor`, `Progress.razor`, `Profile.razor`). |
| Séries par groupe musculaire par semaine | **ABSENTE** | Idem — non trouvé. |
| Mesures corporelles | **ABSENTE** | Aucun modèle de mesure corporelle dans le Core. |
| Photos de progression | **ABSENTE** | Aucune trace de stockage de photos. |
| Suivi de régularité / streak | **DÉJÀ LÀ** | `Progress.razor:135-141`, repris dans `Profile.razor:164-182`. |
| Rapport mensuel | **ABSENTE** | Aucune trace. |
| Bilan annuel | **ABSENTE** | Aucune trace. |

### UI/UX & plateformes

| Feature Hevy | Statut | Preuve SportTracker |
|---|---|---|
| Multi-plateforme (iOS, Android, Watch, Web) | **PARTIELLE** | PWA responsive (manifest + service worker) couvre mobile/desktop via navigateur — `SportTracker.App\wwwroot\manifest.webmanifest:1-22` ; aucune app native ni montre. |
| Widgets d'écran d'accueil | **ABSENTE** | Non applicable à une PWA sans app native ; aucune trace. |
| Application Wear OS dédiée (suivi séance, tuile, FC, minuteurs, marquage séries) | **ABSENTE** | Aucune intégration wearable. |
| Cas d'usage variés (splits, powerlifting, CrossFit, etc.) | **DÉJÀ LÀ** | Le générateur de programme (`WorkoutProgram`) est libre en structure (nombre de séances, exercices, schéma cible), sans limitation à un split prédéfini — `NewProgram.razor:1-21`, `NewProgramSession.razor:1-212`. |

## 2. Améliorations priorisées

### P0 — Fidélité du logging (cœur du produit, risque de perte de données/confiance)

1. **Types de séries (Warmup / Normal / Drop set / Failure)**
   *Justification* : c'est une brique de données fondamentale chez Hevy, absente du modèle `ExerciseSet` actuel (`ExerciseSet.cs:3-10`). Sans elle, l'historique et les stats de volume sont faussés (un échauffement compte comme une série normale). Ajout d'un enum + colonne = migration EF simple, fort impact sur la fiabilité des données déjà collectées.
2. **Détection et notification de record personnel (PR) en direct**
   *Justification* : le calcul 1RM (Epley) existe déjà (`ExerciseLive.razor:214`) mais n'est jamais comparé à l'historique en direct — l'inventaire confirme l'absence totale de PR (section 6, ligne 84). C'est un levier de motivation majeur chez Hevy et le socle de calcul est déjà en place côté SportTracker : gain élevé pour effort modéré.
3. **Sauvegarde automatique / résilience de la séance live en cas de coupure réseau**
   *Justification* : SportTracker est une PWA pensée pour un usage en salle (connectivité instable), et le service worker ne couvre que les assets statiques (`service-worker.published.js:1-61`), pas les données de séance en cours. Perdre une séance en cours de saisie est le pire scénario UX pour un tracker de sport.
4. **Suppression de série pendant la séance live + démarrage "à vide" en mode live (sans routine)**
   *Justification* : actuellement le flux "live" (`ExerciseLive.razor`) est câblé sur une `WorkoutProgramSession` (`ExerciseController.cs:79-147`), et la création à vide passe par un formulaire classique non temps réel (`NewWorkoutSession.razor`). Aligner les deux flux sur l'expérience live est ce qui différencie un tracker "au poignet" d'un simple CRUD après-coup.

### P1 — Richesse des statistiques et de la bibliothèque

5. **Graphiques volume / meilleur poids / reps totales par exercice**
   *Justification* : `ExerciseHistory.razor` n'expose que le 1RM (inventaire ligne 22) ; les données brutes existent déjà via `GET /api/exercises/{id}/history` (`ExerciseController.cs:40-77`), donc c'est principalement un travail de visualisation, pas de collecte.
6. **Graphique de répartition musculaire + séries/semaine par groupe musculaire**
   *Justification* : donnée dérivable directement de `WorkoutExercise → Exercise.MuscleGroups`, déjà stockée. Feature très visible chez Hevy, sans nouveau modèle nécessaire côté SportTracker.
7. **Mesures corporelles + photos de progression**
   *Justification* : nécessite un nouveau modèle (`BodyMeasurement`) et du stockage de fichiers (absent actuellement) — plus lourd que 5/6 mais forte valeur perçue pour le suivi long terme.
8. **RPE par série**
   *Justification* : simple champ optionnel sur `ExerciseSet`, cohérent avec l'ajout des types de séries (P0-1) — à grouper dans la même migration.
9. **Exercices personnalisés — UI de création**
   *Justification* : le endpoint existe déjà (`ExerciseController.cs:33-38`), il manque uniquement l'écran ; complète une fonctionnalité déjà à moitié faite.
10. **Filtrage par équipement dans la bibliothèque d'exercices**
    *Justification* : nécessite d'enrichir le modèle `Exercise` (champ `Equipment`) et potentiellement de re-mapper le dataset de seed (`ExerciseSeeder.cs:8-52`) — effort de données non négligeable, d'où le placement en P1.

### P2 — Fonctionnalités structurantes mais à ROI plus lointain

11. **Dossiers de routines** — organisation, utile seulement si le nombre de programmes créés grossit ; pas bloquant pour l'usage actuel.
12. **Bibliothèque de routines prédéfinies (contenu éditorial Hevy)** — demande de la création de contenu, pas seulement du code.
13. **Calendrier d'entraînement (planning à venir)** — feature significative, mais SportTracker fonctionne aujourd'hui sur un modèle "log après la séance" ; planifier le futur change la philosophie de `Today.razor`.
14. **Rapport mensuel / bilan annuel** — agrégations à valeur ajoutée mais non structurantes, à faire une fois les graphiques de base (P1-5/6) en place.
15. **Widgets écran d'accueil, app Wear OS, Live Activity** — nécessitent des apps natives ou des API plateforme hors de portée d'une PWA Blazor ; investissement disproportionné vs le reste du backlog.
16. **12 paramètres de séance personnalisables** — à faire au fil de l'eau, en fonction des paramètres réellement demandés (unités kg/lb en priorité si usage international).

## 3. Synthèse

### Forces de SportTracker
- **Architecture propre et déjà auth-complète** : Identity bout en bout (token 30 j, filtrage `UserId` par `HasQueryFilter` global, stamping automatique) — plus avancé que ce que documentait le vault (inventaire section 7/écarts).
- **Catalogue d'exercices conséquent** (1324 exercices seedés) avec historique par exercice et calcul 1RM (Epley) déjà fonctionnels — brique de base solide pour bâtir les stats manquantes (P1).
- **Modélisation des programmes plus structurée que la moyenne** : schéma cible explicite (`TargetSets`, `TargetRepsMin/Max`, `RestSeconds`) directement exploité dans le minuteur de repos live.
- **PWA fonctionnelle** avec cache offline des assets — base déjà posée pour aller vers une vraie résilience de données (P0-3).

### Lacunes principales
- **Granularité du logging très en retrait** : pas de types de séries, pas de RPE, pas de notes, pas de supersets — les données collectées aujourd'hui sont plus pauvres que celles de Hevy dès la saisie.
- **Aucune détection de record personnel** malgré un calcul 1RM déjà disponible — écart facile à combler mais non traité.
- **Stats limitées au volume/temps/streak** : rien sur la répartition musculaire, les mesures corporelles ou les photos de progression.
- **Pas de dimension "planification"** : ni calendrier, ni dossiers de routines, ni contenu éditorial (routines prédéfinies).
- **Aucune intégration plateforme au-delà du navigateur** (pas de montre, pas de widgets, pas de Live Activity) — cohérent avec le choix PWA mais à assumer comme limite structurelle.

### Quick-wins (fort ratio valeur / effort)
1. Ajouter un champ `SetType` (enum Warmup/Normal/DropSet/Failure) sur `ExerciseSet` — migration simple, débloque une meilleure qualité de données immédiatement.
2. Détection de PR en direct dans `ExerciseLive.razor` : comparer le 1RM calculé (déjà en ligne 214) à l'historique existant (`GET /api/exercises/{id}/history`) et afficher un toast — pas de nouveau modèle nécessaire.
3. Étendre `ExerciseHistory.razor` avec 2 graphiques supplémentaires (volume, meilleur poids) à partir des données déjà renvoyées par l'endpoint d'historique — travail de front uniquement.
4. Graphique de répartition musculaire calculé côté client à partir des `WorkoutExercise` déjà chargés (pas de nouvel endpoint) — réutilisable sur `Progress.razor`.
5. Champ `Notes` (string, nullable) sur `WorkoutExercise` — à grouper avec le quick-win 1 dans la même migration EF pour limiter les allers-retours DB.
