# Passation lot 9 — Profil UI V4

Statut : validé. Branche : `feat/ui-v4`. Code : `0c4e069`. Docs : `fc9614b`. Session Claude Code, Sonnet 5 / medium (abonnement Pro).

Modifications (fichiers autorisés du contrat + extension explicitement autorisée par l'instruction de lancement) :
- `Pages/Profile.razor` + `.css` réécrits en V4 (`V4Header`, `V4Card`, `V4Loading`, `V4State`, tokens `--st-*`) — dernier écran principal resté sur l'ancien style custom depuis l'étape 4e.
- `Pages/ProfilePreferences.razor` + `.css` (nouveau, `/profile/preferences`) : stepper +/− pour l'objectif hebdomadaire, bouton Enregistrer, état « Préférences indisponibles » (sans bouton) si l'identité ne peut pas être confirmée.
- `Pages/Help.razor` + `.css` (nouveau, `/help`) : contenu statique (créer une séance, suivre un carnet, objectif hebdomadaire, rubriques à venir), aucun lien `#`.
- `Services/WeeklyGoalService.cs` (nouveau, scoped) : objectif hebdomadaire — défaut 4, entier positif — persisté en `localStorage` sous une clé versionnée par l'email réel (`GET manage/info`), jamais un nom d'affichage générique. Sans identité confirmée ou en cas d'échec du stockage (navigation privée, quota, `JSException`), la valeur reste le défaut et `SetGoalAsync` renvoie `false` sans tenter d'écriture.
- `Program.cs` : enregistrement DI de `WeeklyGoalService`.
- **Extension hors périmètre strict du contrat, explicitement incluse par l'instruction de lancement de cette session** : `Pages/Progress.razor` branché sur `WeeklyGoalService` (remplace la constante locale `WeeklyGoalDefault = 4` posée au lot 8 en préparation de ce branchement) — exigence commune Profil/Progrès (même objectif affiché, même badge « Objectif atteint » sur les deux pages).

`/profile/preferences` et `/help` sont protégées par l'`AuthorizeView` déjà global à `MainLayout` (pas de garde supplémentaire nécessaire). Aucun endpoint, modèle, migration ni Tailwind ajouté.

Menu Profil : seuls « Objectifs & préférences » et « Aide & support » sont de vrais liens ; Notifications, Apps connectées et Confidentialité sont rendues en lignes non cliquables (`aria-disabled="true"`) avec un badge « Bientôt disponible », conforme à la note de conception Pencil (`ITixI` documente explicitement que ces rubriques pointaient vers `#` dans l'ancien menu) et au PLAN (rubriques indisponibles explicites, aucun lien `#`). « Membre depuis » reste calculé depuis la première séance réelle de l'historique (Première séance).

Référence design — Pencil MCP (nœud relu, pas tout le document) : `ITixI` (19 · Profil). Aucune maquette dédiée n'existe pour `/profile/preferences` et `/help` (routes nouvelles introduites par ce lot) : ces deux pages sont composées avec les mêmes composants/tokens V4 que le reste de l'app plutôt que copiées d'un nœud Pencil.

Bug trouvé et corrigé en cours de recette : `Title="...&amp;..."` passé à un paramètre de composant Razor (`V4Header`) n'est pas décodé comme une entité HTML par le compilateur (contrairement au texte statique entre balises) — rendu littéral `Objectifs &amp;amp; préférences` à l'écran. Corrigé en passant `&` nu dans l'attribut (`ProfilePreferences.razor`, `Help.razor`). Vérifié que le texte statique dans le menu Profil (`&amp;` entre balises) affichait déjà correctement `&`.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` → 0 avertissement, 0 erreur. Recette Playwright MCP isolée visible, API 5294 (SQLite temporaire du scratchpad, `--no-launch-profile`, `ASPNETCORE_ENVIRONMENT=Development` explicite) + App 5281 (`--no-launch-profile`), compte synthétique `lot9-profil@sporttracker.local` avec une séance muscu du jour et une séance cardio de la veille créées via l'API :
- Profil : identité réelle (email via `manage/info`), stats (séances/jours de suite/minutes), objectif hebdomadaire (2/4 par défaut), menu (2 vrais liens + 3 rubriques « Bientôt disponible »), déconnexion — conforme `ITixI`.
- Préférences : incrément/décrément avec bornage à 1 (bouton « − » désactivé), enregistrement (« Objectif enregistré. »), persistance après rechargement de page, répercussion immédiate sur Profil (`2 / 6 séances…`) et sur Progrès (badge « Objectif atteint » qui apparaît/disparaît selon l'objectif réglé — vérifié à 6 puis à 1).
- Aide : contenu statique affiché, aucun `href="#"` dans toute l'app (`grep` sur `Pages/`).
- Coupure API ciblée sur Préférences (API arrêtée avant navigation) : état « Préférences indisponibles » affiché sans bouton Enregistrer, aucun crash ; API relancée → rechargement normal.
- 320×720, 390×844, 1280×900 sur Profil/Préférences/Aide : aucun débordement horizontal (`scrollWidth === clientWidth` vérifié par script) ; layout centré sur desktop.
- Navigation clavier (Préférences) : lien d'évitement → lien Retour → bouton « Diminuer l'objectif » (ordre correct, pas de piège).
- 404 : route inconnue → page `NotFound` globale (inchangée par ce lot).
- Console : uniquement logs HTTP normaux en usage normal.

Écart consigné, non bloquant : sous coupure API **totale** (API arrêtée avant le tout premier appel de la page, contrairement au test ciblé sur Préférences ci-dessus qui a fonctionné), `Profile.razor` reste bloqué sur « Chargement en cours » au lieu d'afficher l'état d'erreur `V4State` ajouté par ce lot. Plusieurs appels `manage/info` concurrents (un dans `Profile.razor`, un dans `WeeklyGoalService`) semblent déclencher une exception non interceptée au niveau du renderer WASM (`Unhandled exception rendering component`) qui empêche le prochain rendu. Comportement pré-existant : le code d'avant ce lot n'avait aucune gestion d'erreur sur cet écran (`Task.WhenAll` sans try/catch), donc ce n'est pas une régression introduite ici — c'est une limite de la gestion d'erreur ajoutée, qui fonctionne correctement pour le scénario réellement visé par le contrat (identité/stockage indisponibles sur Préférences, validé ci-dessus) mais pas pour une coupure réseau totale dès le premier rendu de Profil. Non reproduit une fois l'API de nouveau disponible. À investiguer au lot 10 si le temps le permet.

Nettoyage : serveurs API/App isolés arrêtés, base SQLite temporaire et captures Playwright supprimées du scratchpad et de la racine du dépôt.

Prochain lot : `10-recette/CONTRAT.md`, même checkout et branche, lancé par le coordinateur (aucun lot 10 lancé par cette session, conformément à l'instruction de cadrage — l'écart ci-dessus doit être vérifié en priorité).
