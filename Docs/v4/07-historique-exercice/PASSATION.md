# Passation lot 7 — Historique exercice UI V4

Statut : validé. Branche : `feat/ui-v4`. Code : `0bd4ec9`. Session Claude Code, escalade Haiku 4.5 → Sonnet 5 / medium (abonnement Pro) après deux tentatives de lancement de recette isolée incomplètes (isolation SQLite non explicite, puis variables non redéfinies dans la commande Bash).

Modifications (seuls fichiers du périmètre) : `Pages/ExerciseHistory.razor` et `Pages/ExerciseHistory.razor.css` réécrits en V4. Aucun changement partagé, endpoint, modèle ou migration.

- En-tête `V4Header` (titre = nom d'exercice résolu depuis le carnet, `BackHref` vers l'exercice en direct).
- Carte « Meilleur 1RM estimé » : valeur en gros (Epley, même formule que le lot 6), sous-texte « Estimation d'après tes séries ».
- Section « Évolution du 1RM » (si ≥ 2 séances) : graphique en **barres** (une par séance, hauteur proportionnelle au 1RM de la séance, barre du record en citron `#D4F53C`, libellé date sous chaque barre) — remplace le sparkline en ligne du code pré-V4 pour coller à la maquette Pencil H3oTC.
- Liste « Historique » : une `V4Card` par séance, titre `date · Record` (si record) et séries réelles listées `poids × reps` séparées par des points médians — remplace les anciens badges/tags par entrée.
- États : `V4Loading` (chargement), `V4State` erreur + Réessayer (échec réseau ou programme introuvable — 404 API), `V4State` « Aucun historique » (aucune séance passée pour l'exercice). `exerciseName` initialisé à « Exercice » par défaut pour éviter un `<h1>` vide pendant l'état d'erreur.
- Retry (`OnRetry`) recharge programme + historique sans perte d'état ; testé après coupure API.

Référence design — Pencil MCP : `H3oTC` (écran 16, capture + lecture des nœuds texte) comparé à la capture Playwright à 390 px : structure (carte 1RM, graphique en barres, liste `date · Record`), textes (« Meilleur 1RM estimé », « Estimation d'après tes séries », « Évolution du 1RM », séries `poids × reps` séparées par ` · `) correspondants. Écart : l'en-tête utilise le `V4Header` standard (flèche `←`) au lieu du texte « ‹ Retour à l'exercice » de la maquette, cohérent avec tous les autres écrans V4 déjà validés (lots 3-6).

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` → 0 avertissement, 0 erreur (build initial + rebuild après ajustements). Recette Playwright MCP isolée visible, API 5294 (SQLite temporaire du scratchpad, `--no-launch-profile`, `ConnectionStrings__DefaultConnection` chemin Windows natif) + App 5281 (`--no-launch-profile`), compte synthétique `lot7-historique@sporttracker.local`, carnet « Force et Regularite » / séance « Push A » (exercice « 3/4 sit-up ») et trois séances passées créées via l'API (01/09, 08/09, 15/09 avec séries réelles) :
- Historique 3 entrées, 1RM Epley correct (record 93,3 kg le 15/09), badge Record positionné sur la bonne entrée, graphique en barres avec barre record en citron.
- État vide : exercice sans séance passée (id 2) → « Aucun historique » affiché, titre `<h1>` = « Exercice » (nom par défaut, exercice absent du carnet).
- 404 : carnet inexistant (999) → `V4State` erreur + Réessayer, titre `<h1>` = « Exercice » (pas de vide).
- Coupure API pendant chargement → erreur affichée ; API relancée sur la même base temporaire (aucune perte) → Réessayer recharge les 3 entrées correctement.
- 320×720, 390×844, 1280×900 : aucun débordement horizontal (cartes, graphique en barres, libellés de date qui tronquent proprement en `ellipsis`) ; layout centré sur desktop.
- Navigation clavier : lien d'évitement puis lien Retour puis nav principale (aucun élément interactif supplémentaire dans le contenu, conforme au contrat qui ne demande pas d'interaction dans l'historique).
- Console : uniquement les logs HTTP normaux et les erreurs réseau/404 volontairement provoquées.

Écarts : vault Obsidian et QMD CLI non disponibles dans cet environnement (serveur MCP `obsidian-parallaxe` en échec de connexion ; pas de collection QMD accessible) — mise à jour vault/QMD non réalisée, à reporter ou réaliser depuis un environnement où ces outils sont connectés. Graphique en barres remplace le sparkline en ligne du code pré-V4 (changement documenté ci-dessus, plus fidèle à Pencil). Cas à un seul point d'historique non testé explicitement (le graphique en barres ne s'affiche qu'à partir de 2 séances, comportement hérité du code pré-V4). `CLAUDE.md` hors commit.

Nettoyage : serveurs API/App isolés arrêtés, base SQLite temporaire (+ fichiers `-shm`/`-wal`) et captures Playwright supprimés du scratchpad et de la racine du dépôt.

Prochain lot : `08-accueil-bilans/CONTRAT.md`, même checkout et branche, lancé par le coordinateur (aucun lot 8 lancé par cette session).
