# Passation lot 4 — Carnets UI V4

Statut : fonctionnellement validé, bloqué pour validation visuelle Pencil. Branche : `feat/ui-v4`.

Modifications : les pages `/programs`, `/programs/new` et `/programs/{id}` utilisent les composants V4 et leurs styles scoped. La liste couvre chargement, vide « Premier carnet » et erreur réseau avec relance. La création conserve toutes les valeurs en cas d'erreur puis mène au détail du carnet créé. Le détail couvre chargement, 404 et erreur réseau avec relance.

Décision fonctionnelle : le détail affiche « Choisir une séance » et chaque séance est un choix explicite. Le CTA automatique « Démarrer la prochaine séance » a été retiré ; aucune règle de calcul de prochaine séance n'est ajoutée.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` réussi hors sandbox, 0 avertissement et 0 erreur ; `git diff --check` OK. Recette réellement exécutée dans le navigateur sur API et SQLite temporaires isolées : liste vide, validation du nom requis, création, détail et lien manuel de séance, 404 `programs/99999`. Reprise réseau complète : API arrêtée pendant la création de « Carnet reprise » / « Force durable » / « Haut reprise », DOM confirme toutes les valeurs conservées, API redémarrée, Réessayer mène au détail créé ; erreurs puis reprises de liste et détail également confirmées. Les largeurs de document sont identiques au viewport à 320×720, 390×844 et 1280×900.

Référence design — blocage important : la CLI officielle `pen.dev` est installée et son shell Pencil est disponible, mais elle exige une authentification avant l’ouverture du document. Sans session Pencil active, les nœuds ST1 V4 prévus (`UsVXH`, `TT55x`, `i9BqS`) ne peuvent pas être lus ni comparés sans contourner l’outil ; aucune lecture brute de `design.pen` n’a été faite. La validation visuelle reste donc bloquée.

Écarts : l’API de liste ne charge pas les séances imbriquées ; les compteurs potentiellement faux ont été retirés de la liste plutôt que d’afficher une information inventée. Les trois erreurs CS7036 héritées restent reportées au lot 10. Aucun endpoint, modèle, migration, base existante ou production n'a été modifié. Le vault est un reparse point non modifiable depuis ce checkout ; QMD a été relancé avec succès mais sans note source modifiée.

Prochain lot : suspendu jusqu’à accès Pencil, puis `05-seances-carnet/CONTRAT.md` sur le même checkout et la même branche.
